<?php

namespace Tests\Feature;

use App\Models\AcademicProgram;
use App\Models\Assessment;
use App\Models\Clearance;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use App\Models\Grade;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\SystemSetting;
use App\Models\Transaction;
use App\Models\User;
use App\Support\AcademicEnrollment;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EnrollmentRequestTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $department;

    private User $registrar;

    private int $departmentId;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->departmentId = Department::create(['code' => 'CCS', 'name' => 'Computing'])->department_id;
        AcademicProgram::create(['department_id' => $this->departmentId, 'name' => 'BS IT']);
        foreach (['student' => [], 'department' => ['subjects.manage', 'grades.manage'], 'registrar' => ['enrollment.manage', 'students.view']] as $key => $permissions) {
            $role = Role::create(['key' => $key, 'label' => ucfirst($key)]);
            foreach ($permissions as $permission) {
                $p = Permission::firstOrCreate(['key' => $permission], ['label' => $permission, 'group' => 'Tests']);
                $role->permissions()->attach($p->permission_id);
            }
            $this->{$key} = User::create(['username' => $key, 'name' => ucfirst($key), 'email' => $key.'@example.test', 'password' => 'test-password',
                'role_id' => $role->role_id, 'department_id' => $key === 'registrar' ? null : $this->departmentId, 'status' => 'Active', 'must_change_password' => false]);
        }
        StudentProfile::create(['user_id' => $this->student->user_id, 'program' => 'BS IT', 'year_level' => '2nd Year', 'birthdate' => '2006-01-01', 'enrolled_on' => '2025-06-01']);
        SystemSetting::create(['system_name' => 'SSIS', 'current_term' => 'First Semester, A.Y. 2026-2027', 'enrollment_open' => true, 'tuition_per_unit' => 1000, 'misc_fees' => 500]);
        $this->subject('BACKLOG', 1);
        $this->subject('CURRENT', 2);
    }

    private function subject(string $code, int $year = 2, string $semester = 'First Semester'): Subject
    {
        return Subject::create(['subject_code' => $code, 'name' => $code.' subject', 'units' => 3, 'department_id' => $this->departmentId,
            'program' => 'BS IT', 'year_level' => $year, 'semester' => $semester, 'academic_year' => '2026-2027']);
    }

    private function requestEnrollment(string $type = 'Irregular'): int
    {
        Grade::firstOrCreate(['student_id' => $this->student->user_id, 'course_code' => 'BACKLOG', 'academic_year' => '2025-2026', 'semester' => 'First Semester'], ['description' => 'Backlog subject', 'units' => 3, 'prelim' => 50, 'midterm' => 50, 'finals' => 50]);
        Sanctum::actingAs($this->student);

        return $this->postJson('/api/enrollment-requests', ['type' => $type, 'notes' => 'Review my academic records.'])->assertOk()->json('id');
    }

    private function recommend(int $id, array $codes = ['BACKLOG', 'CURRENT']): void
    {
        Sanctum::actingAs($this->department);
        $this->patchJson('/api/enrollment-requests/'.$id.'/recommend', ['subjectCodes' => $codes, 'recommendation' => 'Load and prerequisites reviewed.'])->assertOk();
    }

    private function clearOffices(): void
    {
        Clearance::where('student_id', $this->student->user_id)->where('office', '!=', 'Cashier')->update(['status' => 'Cleared']);
    }

    private function confirm(int $id): TestResponse
    {
        Sanctum::actingAs($this->registrar);

        return $this->postJson('/api/enrollment-requests/'.$id.'/decision', ['action' => 'Confirm', 'yearLevel' => 2, 'reviewNotes' => 'Academic placement and records reviewed.']);
    }

    private function studentConfirm(): void
    {
        $assessment = Rules::assessmentFor($this->student->user_id);
        Transaction::firstOrCreate(['reference_no' => 'TEST-CONFIRM-PAYMENT'], ['student_id' => $this->student->user_id, 'assessment_id' => $assessment->assessment_id,
            'type' => 'tuition', 'description' => 'Test payment', 'amount' => Rules::balanceOf($assessment), 'status' => 'Paid']);
        Rules::syncCashierClearance($this->student->user_id, silent: true);
        Sanctum::actingAs($this->student->fresh());
        $this->postJson('/api/enrollment', ['confirmed' => true])->assertOk();
    }

    public function test_old_semester_failed_subject_is_reviewed_and_graded_in_the_new_term(): void
    {
        Subject::where('subject_code', 'BACKLOG')->update(['semester' => 'Second Semester', 'academic_year' => '2024-2025']);
        $id = $this->requestEnrollment();
        Sanctum::actingAs($this->department);
        $details = $this->getJson('/api/enrollment-requests/'.$id)->assertOk();
        $retake = collect($details->json('subjects'))->firstWhere('code', 'BACKLOG');
        $this->assertTrue($retake['retake']);
        $this->assertSame('First Semester', $retake['semester']);
        $this->assertSame('2026-2027', $retake['academicYear']);
        $this->recommend($id);
        $this->clearOffices();
        $this->confirm($id)->assertOk();
        $this->studentConfirm();
        $this->assertDatabaseHas('grades', ['course_code' => 'BACKLOG', 'academic_year' => '2025-2026', 'finals' => 50]);
        $this->assertDatabaseHas('grades', ['course_code' => 'BACKLOG', 'academic_year' => '2026-2027', 'semester' => 'First Semester', 'finals' => null]);
        AcademicEnrollment::prepare($this->student);
        $this->assertSame(2, Grade::where('course_code', 'BACKLOG')->count());
    }

    public function test_irregular_cross_year_enrollment_creates_one_assessment_and_preserves_manual_assignments(): void
    {
        $id = $this->requestEnrollment();
        $this->assertDatabaseCount('grades', 1);
        $this->assertDatabaseCount('assessments', 0);
        $this->recommend($id);
        $this->clearOffices();
        $this->confirm($id)->assertOk()->assertJsonPath('status', 'Approved');
        $this->assertDatabaseHas('enrollments', ['status' => 'Not Enrolled']);
        $this->assertDatabaseCount('users', 3);
        $this->assertDatabaseCount('enrollments', 1);
        $this->assertDatabaseCount('grades', 1);
        $this->assertDatabaseHas('assessments', ['tuition' => 6000, 'misc_fees' => 500]);
        $this->assertDatabaseHas('clearances', ['office' => 'Cashier', 'status' => 'Pending']);
        $this->confirm($id)->assertOk();
        $this->assertDatabaseCount('grades', 1);
        $this->assertDatabaseCount('assessments', 1);
        $this->studentConfirm();
        $this->assertDatabaseCount('grades', 3);
        $this->assertDatabaseHas('enrollment_requests', ['id' => $id, 'status' => 'Confirmed']);
        $this->subject('LATER');
        AcademicEnrollment::prepare($this->student->fresh());
        $this->assertEqualsCanonicalizing(['BACKLOG', 'CURRENT'], Rules::subjectCodesOf(Rules::enrollmentFor($this->student->user_id)));
        Sanctum::actingAs($this->student);
        $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonPath('canSubmit', false)->assertJsonPath('totalUnits', 6);
        $this->getJson('/api/grades/terms/student')->assertOk()->assertJsonCount(2, '1.courses');
        Sanctum::actingAs($this->department);
        $grade = Grade::where('academic_year', '2026-2027')->first();
        $this->patchJson('/api/grades/'.$grade->grade_id, ['prelim' => 60, 'midterm' => 60, 'finals' => 60])->assertOk();
    }

    public function test_returning_inactive_student_keeps_identity_password_and_history(): void
    {
        $password = $this->student->password;
        $this->student->update(['status' => 'Inactive']);
        Grade::create(['student_id' => $this->student->user_id, 'course_code' => 'OLD', 'description' => 'Old subject', 'units' => 3, 'academic_year' => '2024-2025', 'semester' => 'First Semester', 'prelim' => 80, 'midterm' => 80, 'finals' => 80]);
        Sanctum::actingAs($this->registrar);
        $id = $this->postJson('/api/enrollment-requests', ['studentId' => 'student', 'type' => 'Returning', 'notes' => 'Returning after a break.'])->assertOk()->json('id');
        $this->assertSame('Inactive', $this->student->fresh()->status);
        $this->recommend($id, ['BACKLOG']);
        $this->clearOffices();
        $this->confirm($id)->assertOk();
        $this->assertSame('Active', $this->student->fresh()->status);
        $this->assertSame($password, $this->student->fresh()->password);
        $this->assertSame('student', $this->student->fresh()->username);
        $this->assertDatabaseHas('grades', ['course_code' => 'OLD', 'prelim' => 80]);
        $this->assertSame('2025-06-01', StudentProfile::find($this->student->user_id)->enrolled_on->toDateString());
    }

    public function test_subject_choices_exclude_other_program_department_semester_year_and_passed_subjects(): void
    {
        $this->subject('PASSED');
        Grade::create(['student_id' => $this->student->user_id, 'course_code' => 'PASSED', 'description' => 'Passed', 'units' => 3, 'academic_year' => '2025-2026', 'semester' => 'First Semester', 'prelim' => 60, 'midterm' => 60, 'finals' => 60]);
        $this->subject('SECOND', 2, 'Second Semester');
        $this->subject('OTHERPROGRAM')->update(['program' => 'BS CS']);
        $this->subject('OLDYEAR')->update(['academic_year' => '2025-2026']);
        $other = Department::create(['code' => 'CBA', 'name' => 'Business']);
        $this->subject('OTHERDEPT')->update(['department_id' => $other->department_id]);
        $id = $this->requestEnrollment();
        Sanctum::actingAs($this->department);
        $codes = $this->getJson('/api/enrollment-requests/'.$id)->assertOk()->json('subjects');
        $this->assertEqualsCanonicalizing(['BACKLOG', 'CURRENT'], array_column($codes, 'code'));
        foreach (['PASSED', 'SECOND', 'OTHERPROGRAM', 'OLDYEAR', 'OTHERDEPT'] as $code) {
            $this->patchJson('/api/enrollment-requests/'.$id.'/recommend', ['subjectCodes' => [$code], 'recommendation' => 'Review'])->assertStatus(422);
        }
    }

    public function test_duplicate_submission_replays_but_conflicting_request_is_rejected(): void
    {
        $id = $this->requestEnrollment();
        $this->postJson('/api/enrollment-requests', ['type' => 'Irregular', 'notes' => 'Review my academic records.'])->assertOk()->assertJsonPath('id', $id);
        $this->postJson('/api/enrollment-requests', ['type' => 'Returning', 'notes' => 'Different request'])->assertStatus(409);
        $this->assertDatabaseCount('enrollment_requests', 1);
    }

    public function test_student_cannot_bypass_review_or_view_another_student_request(): void
    {
        $id = $this->requestEnrollment();
        $this->postJson('/api/enrollment', ['confirmed' => true])->assertStatus(409);
        $this->postJson('/api/enrollment-requests/'.$id.'/decision', ['action' => 'Confirm', 'yearLevel' => 2, 'reviewNotes' => 'Bypass'])->assertStatus(403);
        $this->patchJson('/api/enrollment-requests/'.$id.'/recommend', ['subjectCodes' => ['BACKLOG'], 'recommendation' => 'Bypass'])->assertStatus(403);
        $other = User::create(['username' => 'other', 'name' => 'Other', 'email' => 'other@example.test', 'password' => 'password', 'role_id' => $this->student->role_id, 'status' => 'Active', 'must_change_password' => false]);
        Sanctum::actingAs($other);
        $this->getJson('/api/enrollment-requests/'.$id)->assertStatus(403);
        $this->postJson('/api/enrollment-requests', ['studentId' => 'student', 'type' => 'Irregular', 'notes' => 'Another student'])->assertStatus(403);
    }

    public function test_department_cannot_access_requests_outside_its_scope(): void
    {
        $id = $this->requestEnrollment();
        $other = Department::create(['code' => 'CBA', 'name' => 'Business']);
        $this->department->update(['department_id' => $other->department_id]);
        Sanctum::actingAs($this->department->fresh());
        $this->getJson('/api/enrollment-requests')->assertOk()->assertExactJson([]);
        $this->getJson('/api/enrollment-requests/'.$id)->assertStatus(403);
        $this->patchJson('/api/enrollment-requests/'.$id.'/recommend', ['subjectCodes' => ['BACKLOG'], 'recommendation' => 'Bypass'])->assertStatus(403);
    }

    public function test_confirmation_requires_department_and_non_cashier_clearance(): void
    {
        $id = $this->requestEnrollment();
        $this->confirm($id)->assertStatus(409);
        $this->recommend($id);
        $this->confirm($id)->assertStatus(422);
        $this->assertDatabaseCount('grades', 1);
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseHas('enrollment_requests', ['id' => $id, 'status' => 'Recommended']);
    }

    public function test_return_and_resubmit_require_a_new_department_review(): void
    {
        $id = $this->requestEnrollment();
        $this->recommend($id);
        Sanctum::actingAs($this->registrar);
        $this->postJson('/api/enrollment-requests/'.$id.'/decision', ['action' => 'Return', 'reviewNotes' => 'Please clarify your return date.'])->assertOk()->assertJsonPath('status', 'Returned');
        Sanctum::actingAs($this->student);
        $this->postJson('/api/enrollment-requests', ['type' => 'Returning', 'notes' => 'Returning this term.'])->assertOk()->assertJsonPath('status', 'Pending')->assertJsonPath('subjectCodes', []);
        $this->confirm($id)->assertStatus(409);
    }

    public function test_rejection_does_not_reactivate_or_finalize_the_student(): void
    {
        $this->student->update(['status' => 'Inactive']);
        Sanctum::actingAs($this->registrar);
        $id = $this->postJson('/api/enrollment-requests', ['studentId' => 'student', 'type' => 'Returning', 'notes' => 'Returning'])->assertOk()->json('id');
        $this->postJson('/api/enrollment-requests/'.$id.'/decision', ['action' => 'Reject', 'reviewNotes' => 'Return requirements not met.'])->assertOk();
        $this->assertSame('Inactive', $this->student->fresh()->status);
        $this->assertDatabaseHas('enrollments', ['status' => 'Not Enrolled']);
        $this->assertDatabaseCount('grades', 0);
        $this->assertDatabaseCount('assessments', 0);
    }

    public function test_stale_term_or_subject_changes_block_confirmation_atomically(): void
    {
        $id = $this->requestEnrollment();
        $this->recommend($id);
        $this->clearOffices();
        Subject::find('CURRENT')->update(['semester' => 'Second Semester']);
        $this->confirm($id)->assertStatus(409);
        $this->assertDatabaseCount('grades', 1);
        $this->assertDatabaseCount('enrollment_subjects', 0);
        $this->recommend($id, ['BACKLOG']);
        SystemSetting::first()->update(['current_term' => 'Second Semester, A.Y. 2026-2027']);
        Rules::forgetSettings();
        $this->confirm($id)->assertStatus(409);
        $this->assertDatabaseCount('grades', 1);
    }

    public function test_second_semester_request_uses_second_semester_subjects(): void
    {
        SystemSetting::first()->update(['current_term' => 'Second Semester, A.Y. 2026-2027']);
        Rules::forgetSettings();
        $this->subject('SECOND', 2, 'Second Semester');
        $id = $this->requestEnrollment();
        $this->recommend($id, ['SECOND']);
        $this->clearOffices();
        $this->confirm($id)->assertOk();
        $this->assertDatabaseMissing('grades', ['course_code' => 'SECOND']);
        $this->studentConfirm();
        $this->assertDatabaseHas('grades', ['course_code' => 'SECOND', 'semester' => 'Second Semester', 'academic_year' => '2026-2027']);
    }

    public function test_regular_enrollment_still_uses_automatic_subject_assignment(): void
    {
        SystemSetting::first()->update(['tuition_per_unit' => 0, 'misc_fees' => 0]);
        Rules::forgetSettings();
        AcademicEnrollment::prepare($this->student);
        $this->assertSame(['CURRENT'], Rules::subjectCodesOf(Rules::enrollmentFor($this->student->user_id)));
        Clearance::where('student_id', $this->student->user_id)->update(['status' => 'Cleared']);
        Sanctum::actingAs($this->student);
        $this->postJson('/api/enrollment', ['confirmed' => true])->assertOk();
        $this->assertDatabaseCount('enrollment_requests', 0);
        $this->assertDatabaseCount('grades', 1);
    }

    public function test_paid_transactions_remain_when_the_manual_assessment_is_recalculated(): void
    {
        AcademicEnrollment::prepare($this->student);
        $assessment = Assessment::first();
        Transaction::create(['reference_no' => 'TEST-PAID', 'student_id' => $this->student->user_id, 'assessment_id' => $assessment->assessment_id,
            'type' => 'tuition', 'description' => 'Previous partial payment', 'amount' => 1000, 'status' => 'Paid']);
        $id = $this->requestEnrollment();
        $this->recommend($id);
        $this->clearOffices();
        $this->confirm($id)->assertOk();
        $this->assertSame($assessment->assessment_id, Assessment::first()->assessment_id);
        $this->assertSame(5500.0, Rules::balanceOf($assessment->fresh()));
        $this->assertDatabaseHas('transactions', ['reference_no' => 'TEST-PAID', 'amount' => 1000, 'status' => 'Paid']);
    }

    public function test_a_billing_failure_rolls_back_enrollment_account_and_subject_changes(): void
    {
        $this->student->update(['status' => 'Inactive']);
        Sanctum::actingAs($this->registrar);
        $id = $this->postJson('/api/enrollment-requests', ['studentId' => 'student', 'type' => 'Returning', 'notes' => 'Returning'])->assertOk()->json('id');
        $this->recommend($id);
        $this->clearOffices();
        Assessment::creating(fn () => throw new \RuntimeException('Simulated billing failure'));
        try {
            $this->confirm($id)->assertStatus(500);
        } finally {
            Assessment::flushEventListeners();
        }
        $this->assertSame('Inactive', $this->student->fresh()->status);
        $this->assertDatabaseHas('enrollment_requests', ['id' => $id, 'status' => 'Recommended']);
        $this->assertDatabaseHas('enrollments', ['status' => 'Not Enrolled']);
        $this->assertDatabaseCount('enrollment_subjects', 0);
        $this->assertDatabaseCount('grades', 0);
    }

    public function test_migration_preserves_existing_enrollment_and_subject_snapshots(): void
    {
        $migration = require database_path('migrations/2026_10_11_142724_create_enrollment_requests_table.php');
        $migration->down();
        $enrollment = Enrollment::create(['student_id' => $this->student->user_id, 'term' => 'First Semester, A.Y. 2025-2026', 'status' => 'Enrolled', 'year_level' => 2, 'program_snapshot' => 'BS IT']);
        EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => 'CURRENT', 'subject_name' => 'Historical name', 'units' => 3]);
        $migration->up();
        $this->assertSame('automatic', $enrollment->fresh()->assignment_mode);
        $this->assertSame('Enrolled', $enrollment->fresh()->status);
        $this->assertDatabaseHas('enrollment_subjects', ['subject_name' => 'Historical name', 'units' => 3]);
        $this->assertDatabaseCount('enrollments', 1);
        $this->assertDatabaseCount('enrollment_requests', 0);
    }

    public function test_approved_subjects_still_require_student_confirmation_and_all_clearances(): void
    {
        $id = $this->requestEnrollment();
        $this->recommend($id);
        $this->clearOffices();
        $this->confirm($id)->assertOk()->assertJsonPath('status', 'Approved');
        $this->assertDatabaseMissing('grades', ['academic_year' => '2026-2027']);
        Sanctum::actingAs($this->student);
        $this->postJson('/api/enrollment', ['confirmed' => false])->assertUnprocessable();
        $this->postJson('/api/enrollment', ['confirmed' => true])->assertUnprocessable();
        $this->assertDatabaseHas('enrollments', ['status' => 'Not Enrolled']);
        $this->studentConfirm();
        $this->postJson('/api/enrollment', ['confirmed' => true])->assertOk();
        $this->assertDatabaseCount('grades', 3);
        $this->assertDatabaseCount('enrollments', 1);
        $this->assertDatabaseHas('enrollment_requests', ['id' => $id, 'status' => 'Confirmed']);
    }

    public function test_subject_changes_after_approval_require_fresh_staff_review(): void
    {
        $id = $this->requestEnrollment();
        $this->recommend($id);
        $this->clearOffices();
        $this->confirm($id)->assertOk();
        $assessment = Rules::assessmentFor($this->student->user_id);
        Transaction::create(['reference_no' => 'TEST-CLEARED', 'student_id' => $this->student->user_id, 'assessment_id' => $assessment->assessment_id,
            'type' => 'tuition', 'description' => 'Test payment', 'amount' => Rules::totalOf($assessment), 'status' => 'Paid']);
        Subject::find('BACKLOG')->update(['schedule' => 'Changed schedule']);
        Sanctum::actingAs($this->student);
        $this->postJson('/api/enrollment', ['confirmed' => true])->assertStatus(409);
        $this->assertDatabaseMissing('grades', ['academic_year' => '2026-2027']);
        $this->assertDatabaseHas('enrollments', ['status' => 'Not Enrolled']);
        Sanctum::actingAs($this->registrar);
        $this->postJson('/api/enrollment-requests/'.$id.'/decision', ['action' => 'Return', 'reviewNotes' => 'Review the changed schedule.'])->assertOk()->assertJsonPath('status', 'Returned');
        $this->assertDatabaseCount('enrollment_subjects', 0);
        $this->assertDatabaseHas('transactions', ['reference_no' => 'TEST-CLEARED', 'status' => 'Paid']);
    }

    public function test_irregular_review_cannot_change_official_year_level_or_add_unrelated_lower_year_subjects(): void
    {
        $this->subject('UNATTEMPTED', 1);
        $this->subject('FUTURE', 3);
        $id = $this->requestEnrollment();
        Sanctum::actingAs($this->department);
        foreach (['UNATTEMPTED', 'FUTURE'] as $code) {
            $this->patchJson('/api/enrollment-requests/'.$id.'/recommend', ['subjectCodes' => [$code], 'recommendation' => 'Review'])->assertUnprocessable();
        }
        $this->recommend($id);
        $this->clearOffices();
        Sanctum::actingAs($this->registrar);
        $this->postJson('/api/enrollment-requests/'.$id.'/decision', ['action' => 'Confirm', 'yearLevel' => 3, 'reviewNotes' => 'Review'])->assertUnprocessable();
        $this->assertSame('2nd Year', StudentProfile::first()->year_level);
    }

    public function test_closed_enrollment_and_existing_completed_enrollment_are_rejected(): void
    {
        SystemSetting::first()->update(['enrollment_open' => false]);
        Rules::forgetSettings();
        Sanctum::actingAs($this->student);
        $this->postJson('/api/enrollment-requests', ['type' => 'Irregular', 'notes' => 'Request'])->assertStatus(409);
        SystemSetting::first()->update(['enrollment_open' => true]);
        Rules::forgetSettings();
        Enrollment::create(['student_id' => $this->student->user_id, 'term' => Rules::currentTerm(), 'status' => 'Enrolled']);
        $this->postJson('/api/enrollment-requests', ['type' => 'Irregular', 'notes' => 'Request'])->assertStatus(409);
    }

    public function test_grade_creation_failure_rolls_back_student_confirmation_without_losing_staff_approval(): void
    {
        $id = $this->requestEnrollment();
        $this->recommend($id);
        $this->clearOffices();
        $this->confirm($id)->assertOk();
        $assessment = Rules::assessmentFor($this->student->user_id);
        Transaction::create(['reference_no' => 'TEST-ATOMIC', 'student_id' => $this->student->user_id, 'assessment_id' => $assessment->assessment_id,
            'type' => 'tuition', 'description' => 'Test payment', 'amount' => Rules::totalOf($assessment), 'status' => 'Paid']);
        Grade::creating(fn () => throw new \RuntimeException('Simulated grade creation failure'));
        Sanctum::actingAs($this->student);
        try {
            $this->postJson('/api/enrollment', ['confirmed' => true])->assertStatus(500);
        } finally {
            Grade::flushEventListeners();
        }
        $this->assertDatabaseHas('enrollments', ['status' => 'Not Enrolled']);
        $this->assertDatabaseHas('enrollment_requests', ['id' => $id, 'status' => 'Approved']);
        $this->assertDatabaseCount('grades', 1);
        $this->assertDatabaseCount('enrollment_subjects', 2);
        $this->assertDatabaseHas('transactions', ['reference_no' => 'TEST-ATOMIC', 'status' => 'Paid']);
    }

    public function test_regular_student_cannot_switch_regular_enrollment_to_irregular_or_returning(): void
    {
        AcademicEnrollment::prepare($this->student);
        $before = Rules::subjectCodesOf(Rules::enrollmentFor($this->student->user_id));
        Sanctum::actingAs($this->student);
        $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonPath('eligibleRequestTypes', []);
        foreach (['Irregular', 'Returning'] as $type) {
            $this->postJson('/api/enrollment-requests', ['type' => $type, 'notes' => 'Attempt invalid special enrollment.'])->assertStatus(422);
        }
        $this->assertDatabaseCount('enrollment_requests', 0);
        $this->assertSame($before, Rules::subjectCodesOf(Rules::enrollmentFor($this->student->user_id)));
        $this->assertSame('automatic', Rules::enrollmentFor($this->student->user_id)->assignment_mode);
    }

    public function test_department_cannot_process_irregular_request_after_backlog_is_passed(): void
    {
        $id = $this->requestEnrollment();
        Grade::query()->update(['prelim' => 60, 'midterm' => 60, 'finals' => 60]);
        Sanctum::actingAs($this->department);
        $detail = $this->getJson('/api/enrollment-requests/'.$id)->assertOk();
        $this->assertFalse(collect($detail->json('subjects'))->contains('code', 'BACKLOG'));
        $this->patchJson('/api/enrollment-requests/'.$id.'/recommend', ['subjectCodes' => ['BACKLOG', 'CURRENT'], 'recommendation' => 'Invalid retake'])->assertStatus(422);
        $this->assertDatabaseHas('enrollment_requests', ['id' => $id, 'status' => 'Pending']);
    }

    public function test_registrar_rechecks_passed_subjects_after_department_recommendation(): void
    {
        $id = $this->requestEnrollment();
        $this->recommend($id);
        $this->clearOffices();
        Grade::query()->update(['prelim' => 60, 'midterm' => 60, 'finals' => 60]);
        $this->confirm($id)->assertStatus(422);
        $this->assertDatabaseHas('enrollment_requests', ['id' => $id, 'status' => 'Recommended']);
    }

    public function test_carryover_payment_allocates_oldest_debt_without_duplicating_charges(): void
    {
        $old = Assessment::create(['student_id' => $this->student->user_id, 'term' => 'Second Semester, A.Y. 2025-2026', 'tuition' => 10000, 'misc_fees' => 0]);
        Rules::recordTuitionPayment($old, 5000, 'Previous partial payment', 'Cash', $this->registrar);
        $current = Assessment::create(['student_id' => $this->student->user_id, 'term' => Rules::currentTerm(), 'tuition' => 12000, 'misc_fees' => 0]);
        Assessment::create(['student_id' => $this->student->user_id, 'term' => 'First Semester, A.Y. 2027-2028', 'tuition' => 99999, 'misc_fees' => 0]);
        Clearance::create(['student_id' => $this->student->user_id, 'office' => 'Cashier', 'term' => Rules::currentTerm(), 'status' => 'Pending']);
        Sanctum::actingAs($this->student);
        $this->getJson('/api/payments/student/student')->assertOk()->assertJsonPath('assessment.balance', 17000)->assertJsonPath('assessment.carryForward', 5000);
        $permission = Permission::firstOrCreate(['key' => 'payments.manage'], ['label' => 'Payments', 'group' => 'Tests']);
        $this->registrar->role->permissions()->attach($permission->permission_id);
        Sanctum::actingAs($this->registrar->fresh());
        $this->postJson('/api/assessments/'.$current->assessment_id.'/payments', ['amount' => 6000, 'method' => 'Cash'])
            ->assertOk()->assertJsonPath('balance', 11000)->assertJsonPath('carryForward', 0);
        $this->assertSame(0.0, Rules::balanceOf($old->fresh()));
        $this->assertSame(11000.0, Rules::balanceOf($current->fresh()));
        $this->assertSame(10000.0, (float) $old->fresh()->tuition);
        $this->assertDatabaseCount('transactions', 3);
        $this->assertDatabaseHas('clearances', ['office' => 'Cashier', 'status' => 'Pending']);
        $this->postJson('/api/assessments/'.$current->assessment_id.'/payments', ['amount' => 11001, 'method' => 'Cash'])->assertUnprocessable();
        $this->assertDatabaseCount('transactions', 3);
        $this->postJson('/api/assessments/'.$current->assessment_id.'/payments', ['amount' => 11000, 'method' => 'Cash'])->assertOk()->assertJsonPath('balance', 0);
        $this->assertDatabaseHas('clearances', ['office' => 'Cashier', 'status' => 'Cleared']);
    }

    public function test_previous_balance_is_visible_without_a_current_assessment(): void
    {
        Assessment::create(['student_id' => $this->student->user_id, 'term' => 'Second Semester, A.Y. 2025-2026', 'tuition' => 5000, 'misc_fees' => 0]);
        Sanctum::actingAs($this->student);
        $this->getJson('/api/payments/student/student')->assertOk()->assertJsonPath('assessment', null)->assertJsonPath('previousBalance', 5000);
    }

    public function test_semester_then_year_transition_preserves_debt_and_repeated_preparation_does_not_copy_it(): void
    {
        $old = Assessment::create(['student_id' => $this->student->user_id, 'term' => Rules::currentTerm(), 'tuition' => 5000, 'misc_fees' => 0]);
        $this->subject('SECONDNEW', 2, 'Second Semester');
        SystemSetting::first()->update(['current_term' => 'Second Semester, A.Y. 2026-2027']);
        AcademicEnrollment::prepare($this->student);
        AcademicEnrollment::prepare($this->student);
        $current = Rules::assessmentFor($this->student->user_id);
        $this->assertSame(5000.0, Rules::balanceOf($old->fresh()));
        $this->assertSame(8500.0, Rules::amountDue($current));
        $this->assertSame(3500.0, Rules::totalOf($current));
        $this->assertDatabaseCount('assessments', 2);
        SystemSetting::first()->update(['current_term' => 'First Semester, A.Y. 2027-2028']);
        Subject::where('subject_code', 'CURRENT')->update(['academic_year' => '2027-2028']);
        AcademicEnrollment::prepare($this->student);
        $this->assertSame(8500.0, Rules::carryForward(Rules::assessmentFor($this->student->user_id)));
        $this->assertDatabaseCount('assessments', 3);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_unallocated_current_term_credit_cannot_silently_clear_old_debt(): void
    {
        Assessment::create(['student_id' => $this->student->user_id, 'term' => 'Second Semester, A.Y. 2025-2026', 'tuition' => 5000, 'misc_fees' => 0]);
        $current = Assessment::create(['student_id' => $this->student->user_id, 'term' => Rules::currentTerm(), 'tuition' => 2000, 'misc_fees' => 0]);
        Rules::recordTuitionPayment($current, 2000, 'Earlier payment', 'Cash', $this->registrar);
        $current->update(['tuition' => 1000]);
        $this->assertSame(5000.0, Resources::assessment($current)['balance']);
        $this->assertSame(5000.0, Rules::amountDue($current));
    }

    public function test_returning_a_stale_irregular_approval_restores_regular_enrollment(): void
    {
        $id = $this->requestEnrollment();
        $this->recommend($id);
        $this->clearOffices();
        $this->confirm($id)->assertOk();
        Grade::query()->update(['prelim' => 60, 'midterm' => 60, 'finals' => 60]);
        Sanctum::actingAs($this->registrar);
        $this->postJson('/api/enrollment-requests/'.$id.'/decision', ['action' => 'Return', 'reviewNotes' => 'Backlog resolved; use regular enrollment.'])->assertOk();
        $draft = Rules::enrollmentFor($this->student->user_id);
        $this->assertSame('automatic', $draft->assignment_mode);
        $this->assertSame(['CURRENT'], Rules::subjectCodesOf($draft));
        $this->assertTrue(AcademicEnrollment::canConfirm($this->student, $draft));
    }
}
