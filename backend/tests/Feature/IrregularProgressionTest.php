<?php

namespace Tests\Feature;

use App\Models\AcademicProgram;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use App\Models\Grade;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\AcademicAssignments;
use App\Support\AcademicEnrollment;
use App\Support\Resources;
use App\Support\Rules;
use App\Support\StudentProgression;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class IrregularProgressionTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $staff;

    private User $admin;

    private int $department;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->department = Department::create(['code' => 'CCS', 'name' => 'Computing'])->department_id;
        AcademicProgram::create(['department_id' => $this->department, 'name' => 'BS IT']);
        foreach (['student', 'department', 'admin'] as $key) {
            $role = Role::create(['key' => $key, 'label' => ucfirst($key)]);
            $keys = $key === 'admin' ? ['settings.manage'] : ($key === 'department' ? ['subjects.manage', 'grades.manage'] : []);
            foreach ($keys as $permission) {
                $row = Permission::firstOrCreate(['key' => $permission], ['label' => $permission, 'group' => 'Tests']);
                $role->permissions()->attach($row->permission_id);
            }
            $user = User::create(['username' => $key, 'name' => ucfirst($key), 'email' => $key.'@example.test', 'password' => 'test-password',
                'role_id' => $role->role_id, 'department_id' => $this->department, 'status' => 'Active', 'must_change_password' => false]);
            if ($key === 'student') {
                $this->student = $user;
            } elseif ($key === 'department') {
                $this->staff = $user;
            } else {
                $this->admin = $user;
            }
        }
        StudentProfile::create(['user_id' => $this->student->user_id, 'program' => 'BS IT', 'year_level' => '1st Year', 'birthdate' => '2006-01-01']);
        SystemSetting::create(['system_name' => 'SSIS', 'current_term' => '1st Semester, A.Y. 2026-2027', 'enrollment_open' => true, 'tuition_per_unit' => 1000, 'misc_fees' => 500]);
    }

    private function subject(string $code, string $semester, int $year = 1, ?string $academicYear = '2026-2027'): Subject
    {
        return Subject::create(['subject_code' => $code, 'name' => $code.' subject', 'units' => 3, 'department_id' => $this->department,
            'program' => 'BS IT', 'year_level' => $year, 'semester' => $semester, 'academic_year' => $academicYear]);
    }

    private function completedYear(int $year = 1, float $mark = 60): void
    {
        StudentProfile::first()->update(['year_level' => AcademicAssignments::label($year)]);
        foreach (['First Semester', 'Second Semester'] as $index => $semester) {
            $subject = $this->subject('Y'.$year.'S'.$index, $semester, $year);
            $enrollment = Enrollment::create(['student_id' => $this->student->user_id, 'term' => $semester.', A.Y. 2026-2027', 'status' => 'Enrolled',
                'year_level' => $year, 'program_snapshot' => 'BS IT']);
            EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $subject->subject_code, 'subject_name' => $subject->name, 'units' => 3]);
            Grade::create(['student_id' => $this->student->user_id, 'course_code' => $subject->subject_code, 'description' => $subject->name, 'units' => 3,
                'academic_year' => '2026-2027', 'semester' => $semester, 'prelim' => $mark, 'midterm' => $mark, 'finals' => $mark]);
        }
        SystemSetting::first()->update(['current_term' => '2nd Semester, A.Y. 2026-2027']);
        Rules::forgetSettings();
    }

    public static function irregularYears(): array
    {
        return [[1, 50], [2, 50], [3, 50], [4, 50], [1, null], [2, null], [3, null], [4, null]];
    }

    #[DataProvider('irregularYears')]
    public function test_backlog_advancement_requires_explicit_review_and_preserves_attempts(int $year, ?float $mark): void
    {
        $this->completedYear($year);
        $grade = Grade::where('semester', 'First Semester')->first();
        $grade->update(['prelim' => $mark, 'midterm' => $mark, 'finals' => $mark]);
        Subject::find($grade->course_code)->update(['academic_year' => null]);
        $this->subject('NEXT', 'First Semester', $year + 1, '2027-2028');
        Sanctum::actingAs($this->admin);
        $target = 'First Semester, A.Y. 2027-2028';
        $this->postJson('/api/academic/promotions/preview', ['targetTerm' => $target])->assertOk()
            ->assertJsonPath('students.0.eligible', true)->assertJsonPath('students.0.requiresReview', true)
            ->assertJsonPath('students.0.classification', 'Irregular')->assertJsonPath('students.0.toYear', $year + 1);
        $payload = ['targetTerm' => $target, 'sourceTerm' => Rules::currentTerm(), 'studentIds' => [$this->student->user_id], 'reviewed' => true];
        $this->postJson('/api/academic/promotions/activate', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('student_promotions', 0);
        $this->assertSame(AcademicAssignments::label($year), StudentProfile::first()->year_level);
        $payload['irregularStudentIds'] = [$this->student->user_id];
        $this->postJson('/api/academic/promotions/activate', $payload)->assertOk();
        $this->postJson('/api/academic/promotions/activate', $payload)->assertStatus(409);
        $this->assertSame(AcademicAssignments::label($year + 1), StudentProfile::first()->year_level);
        $this->assertSame('Irregular', Resources::user($this->student->fresh())['classification']);
        $this->assertDatabaseCount('grades', 2);
        $this->assertSame($mark, $grade->fresh()->finals);
        Sanctum::actingAs($this->student);
        $response = $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonPath('classification', 'Irregular')->assertJsonPath('canSubmit', false);
        $this->assertEqualsCanonicalizing(['NEXT', $grade->course_code], array_column($response->json('availableSubjects'), 'code'));
        $this->assertSame(1, collect($response->json('availableSubjects'))->where('retake', true)->count());
        $this->assertDatabaseCount('student_promotions', 1);
    }

    public function test_passed_retake_resolves_classification_and_is_not_offered_again(): void
    {
        $this->completedYear(1, 50);
        SystemSetting::first()->update(['current_term' => 'First Semester, A.Y. 2027-2028']);
        StudentProfile::first()->update(['year_level' => '2nd Year']);
        Rules::forgetSettings();
        Subject::query()->update(['academic_year' => null]);
        Grade::where('semester', 'Second Semester')->first()->update(['prelim' => 60, 'midterm' => 60, 'finals' => 60]);
        $old = Grade::where('semester', 'First Semester')->first();
        Grade::create(['student_id' => $this->student->user_id, 'course_code' => $old->course_code, 'description' => 'Retake', 'units' => 3,
            'academic_year' => '2027-2028', 'semester' => 'First Semester', 'prelim' => 60, 'midterm' => 60, 'finals' => 60]);
        $this->subject('CURRENT', 'First Semester', 2, '2027-2028');
        Sanctum::actingAs($this->student);
        $response = $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonPath('classification', 'Regular')->assertJsonCount(1, 'availableSubjects');
        $this->assertSame('CURRENT', $response->json('availableSubjects.0.code'));
        $this->assertSame(50.0, $old->fresh()->finals);
        $this->assertDatabaseCount('grades', 3);
    }

    public function test_missing_required_subject_is_reviewable_but_missing_semester_enrollment_is_blocked(): void
    {
        $this->completedYear();
        $this->subject('MISSING', 'First Semester');
        $review = StudentProgression::evaluate($this->student, '2026-2027', '2027-2028');
        $this->assertTrue($review['eligible']);
        $this->assertTrue($review['requiresReview']);
        $this->assertSame('MISSING', $review['incompleteSubjects'][0]['code']);
        Enrollment::where('term', 'Second Semester, A.Y. 2026-2027')->first()->update(['status' => 'Not Enrolled']);
        $this->assertFalse(StudentProgression::evaluate($this->student, '2026-2027', '2027-2028')['eligible']);
    }

    public function test_program_duration_and_inactive_accounts_still_block_advancement(): void
    {
        $this->completedYear(4, 50);
        AcademicProgram::first()->update(['duration_years' => 4]);
        $review = StudentProgression::evaluate($this->student, '2026-2027', '2027-2028');
        $this->assertFalse($review['eligible']);
        $this->assertSame(4, $review['toYear']);
        $this->student->update(['status' => 'Inactive']);
        $this->assertFalse(StudentProgression::evaluate($this->student, '2026-2027', '2027-2028')['eligible']);
    }

    public function test_active_term_blank_grades_do_not_create_a_false_backlog(): void
    {
        $this->subject('CURRENT', 'First Semester');
        AcademicEnrollment::prepare($this->student);
        Grade::create(['student_id' => $this->student->user_id, 'course_code' => 'CURRENT', 'description' => 'In progress', 'units' => 3,
            'academic_year' => '2026-2027', 'semester' => 'First Semester']);
        $this->assertSame('Regular', Resources::user($this->student)['classification']);
    }

    public function test_finalized_automatic_enrollment_does_not_silently_add_a_lower_level_retake(): void
    {
        StudentProfile::first()->update(['year_level' => '2nd Year']);
        $current = $this->subject('CURRENT', 'First Semester', 2);
        $old = $this->subject('RETAKE', 'First Semester', 1, null);
        $enrollment = Enrollment::create(['student_id' => $this->student->user_id, 'term' => Rules::currentTerm(), 'status' => 'Enrolled', 'year_level' => 2, 'program_snapshot' => 'BS IT']);
        EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $current->subject_code, 'subject_name' => $current->name, 'units' => 3]);
        Grade::create(['student_id' => $this->student->user_id, 'course_code' => $old->subject_code, 'description' => $old->name, 'units' => 3,
            'academic_year' => '2025-2026', 'semester' => 'First Semester', 'prelim' => 50, 'midterm' => 50, 'finals' => 50]);
        AcademicEnrollment::prepare($this->student);
        $this->assertSame(['CURRENT'], Rules::subjectCodesOf($enrollment));
        $this->assertDatabaseMissing('grades', ['course_code' => 'RETAKE', 'academic_year' => '2026-2027']);
    }

    public function test_irregular_second_semester_offerings_refresh_after_department_adds_subjects(): void
    {
        StudentProfile::first()->update(['year_level' => '2nd Year']);
        $this->subject('FIRSTCURRENT', 'First Semester', 2);
        $this->subject('SECONDRETAKE', 'Second Semester', 1, null);
        Grade::create(['student_id' => $this->student->user_id, 'course_code' => 'SECONDRETAKE', 'description' => 'Previous failed subject', 'units' => 3,
            'academic_year' => '2025-2026', 'semester' => 'Second Semester', 'prelim' => 50, 'midterm' => 50, 'finals' => 50]);
        Sanctum::actingAs($this->student);
        $first = $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonCount(2, 'availableSubjects');
        $this->assertEqualsCanonicalizing(['FIRSTCURRENT', 'SECONDRETAKE'], array_column($first->json('availableSubjects'), 'code'));
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/settings', ['systemName' => 'SSIS', 'currentTerm' => 'Second Semester, A.Y. 2026-2027', 'enrollmentOpen' => true])->assertOk();
        Sanctum::actingAs($this->staff);
        $this->postJson('/api/subjects', ['code' => 'SECONDNEW', 'name' => 'New second-year subject', 'units' => 3, 'program' => 'BS IT',
            'yearLevel' => 2, 'semester' => 'Second Semester', 'academicYear' => '2026-2027'])->assertOk();
        Sanctum::actingAs($this->student);
        $response = $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonCount(2, 'availableSubjects')->assertJsonPath('classification', 'Irregular');
        $this->assertEqualsCanonicalizing(['SECONDNEW', 'SECONDRETAKE'], array_column($response->json('availableSubjects'), 'code'));
        $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonCount(2, 'availableSubjects');
        $this->assertDatabaseCount('grades', 1);
    }

    public function test_retake_grade_encoding_preserves_original_and_reports_history(): void
    {
        $this->completedYear(1, 50);
        Grade::where('semester', 'Second Semester')->update(['prelim' => 60, 'midterm' => 60, 'finals' => 60]);
        $old = Grade::where('semester', 'First Semester')->first();
        SystemSetting::first()->update(['current_term' => 'First Semester, A.Y. 2027-2028']);
        StudentProfile::first()->update(['year_level' => '2nd Year']);
        $enrollment = Enrollment::create(['student_id' => $this->student->user_id, 'term' => Rules::currentTerm(),
            'status' => 'Enrolled', 'assignment_mode' => 'manual', 'year_level' => 2, 'program_snapshot' => 'BS IT']);
        EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $old->course_code,
            'subject_name' => $old->description, 'units' => 3]);
        Rules::createGradeRows($this->student, $enrollment);
        Rules::createGradeRows($this->student, $enrollment);
        $new = Grade::where('academic_year', '2027-2028')->first();
        Sanctum::actingAs($this->staff);
        $this->getJson('/api/grades?academic_year=2027-2028&semester=First%20Semester&year_level=2')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.retake', true)->assertJsonPath('0.previousAttempts.0.status', 'Failed');
        $this->patchJson('/api/grades/'.$new->grade_id, ['prelim' => 60, 'midterm' => 60, 'finals' => 60])
            ->assertOk()->assertJsonPath('status', 'Passed');
        $this->assertSame(50.0, $old->fresh()->finals);
        $this->assertDatabaseCount('grades', 3);
        Sanctum::actingAs($this->student);
        $response = $this->getJson('/api/grades/terms/student')->assertOk();
        $this->assertSame('Passed', $response->json('2.courses.0.status'));
        $this->assertSame('Failed', $response->json('2.courses.0.previousAttempts.0.status'));
        $this->assertSame('Regular', Resources::user($this->student)['classification']);
    }

    public function test_current_failed_grade_classifies_irregular_but_blank_grade_does_not(): void
    {
        $this->subject('CURRENTFAIL', 'First Semester');
        $grade = Grade::create(['student_id' => $this->student->user_id, 'course_code' => 'CURRENTFAIL', 'description' => 'Current',
            'units' => 3, 'academic_year' => '2026-2027', 'semester' => 'First Semester']);
        $this->assertSame('Regular', Resources::user($this->student)['classification']);
        $grade->update(['prelim' => 50, 'midterm' => 50, 'finals' => 50]);
        $this->assertSame('Irregular', Resources::user($this->student)['classification']);
    }

    public function test_manual_enrollment_does_not_create_backlog_for_unassigned_subjects(): void
    {
        $this->subject('UNASSIGNED', 'First Semester');
        Enrollment::create(['student_id' => $this->student->user_id, 'term' => Rules::currentTerm(), 'status' => 'Enrolled',
            'assignment_mode' => 'manual', 'year_level' => 1, 'program_snapshot' => 'BS IT']);
        SystemSetting::first()->update(['current_term' => 'Second Semester, A.Y. 2026-2027']);
        $this->assertSame('Regular', Resources::user($this->student)['classification']);
    }

    public static function failedPromotionPeriods(): array
    {
        return [[1, 'First Semester'], [1, 'Second Semester'], [2, 'First Semester'], [2, 'Second Semester'],
            [3, 'First Semester'], [3, 'Second Semester'], [4, 'First Semester'], [4, 'Second Semester']];
    }

    #[DataProvider('failedPromotionPeriods')]
    public function test_failed_subject_moves_with_reviewed_promotion_and_receives_a_separate_grade(int $year, string $failedSemester): void
    {
        $this->completedYear($year);
        $old = Grade::where('semester', $failedSemester)->first();
        $old->update(['prelim' => 50, 'midterm' => 50, 'finals' => 50]);
        Subject::find($old->course_code)->update(['academic_year' => '2027-2028', 'semester' => 'First Semester']);
        $current = $this->subject('NEWYEAR', 'First Semester', $year + 1, '2027-2028');
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/academic/promotions/activate', ['targetTerm' => 'First Semester, A.Y. 2027-2028',
            'sourceTerm' => Rules::currentTerm(), 'studentIds' => [$this->student->user_id],
            'irregularStudentIds' => [$this->student->user_id], 'reviewed' => true])->assertOk();
        $this->assertSame('Irregular', Resources::user($this->student)['classification']);
        Sanctum::actingAs($this->student);
        $response = $this->getJson('/api/enrollment/student/student')->assertOk();
        $this->assertEqualsCanonicalizing([$old->course_code, 'NEWYEAR'], array_column($response->json('availableSubjects'), 'code'));
        $enrollment = Rules::enrollmentFor($this->student->user_id);
        $enrollment->update(['status' => 'Enrolled', 'assignment_mode' => 'manual']);
        foreach ([$old->course_code => $old->description, 'NEWYEAR' => $current->name] as $code => $name) {
            EnrollmentSubject::updateOrCreate(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $code],
                ['subject_name' => $name, 'units' => 3]);
        }
        Rules::createGradeRows($this->student, $enrollment);
        Rules::createGradeRows($this->student, $enrollment);
        $new = Grade::where('academic_year', '2027-2028')->where('course_code', $old->course_code)->firstOrFail();
        Sanctum::actingAs($this->staff);
        $this->getJson('/api/grades?academic_year=2027-2028&year_level='.($year + 1))->assertOk()->assertJsonCount(2);
        $this->patchJson('/api/grades/'.$new->grade_id, ['prelim' => 60, 'midterm' => 60, 'finals' => 60])->assertOk()->assertJsonPath('status', 'Passed');
        $this->assertSame(50.0, $old->fresh()->finals);
        $this->assertDatabaseCount('grades', 4);
        Sanctum::actingAs($this->student);
        $terms = $this->getJson('/api/grades/terms/student')->assertOk()->json();
        $this->assertSame($year, $terms[0]['yearLevel']);
        $this->assertSame($year + 1, $terms[2]['yearLevel']);
        $attempt = collect($terms[2]['courses'])->firstWhere('code', $old->course_code);
        $this->assertTrue($attempt['retake']);
        $this->assertSame('Passed', $attempt['status']);
        $this->assertSame('Failed', $attempt['previousAttempts'][0]['status']);
    }

    public function test_same_academic_year_second_semester_retake_preserves_first_semester(): void
    {
        $this->completedYear(1, 60);
        $old = Grade::where('semester', 'First Semester')->first();
        $old->update(['prelim' => 50, 'midterm' => 50, 'finals' => 50]);
        Subject::find($old->course_code)->update(['semester' => 'Second Semester']);
        $enrollment = Enrollment::where('term', 'Second Semester, A.Y. 2026-2027')->first();
        EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $old->course_code,
            'subject_name' => $old->description, 'units' => 3]);
        Rules::createGradeRows($this->student, $enrollment);
        $new = Grade::where('course_code', $old->course_code)->where('semester', 'Second Semester')->firstOrFail();
        Sanctum::actingAs($this->staff);
        $this->patchJson('/api/grades/'.$new->grade_id, ['prelim' => 80, 'midterm' => 80, 'finals' => 80])->assertOk();
        Sanctum::actingAs($this->student);
        $terms = $this->getJson('/api/grades/terms/student')->assertOk()->json();
        $this->assertSame('Failed', $terms[0]['courses'][0]['status']);
        $retake = collect($terms[1]['courses'])->firstWhere('code', $old->course_code);
        $this->assertSame('Passed', $retake['status']);
        $this->assertTrue($retake['retake']);
        $this->assertSame(50.0, $old->fresh()->finals);
    }

    public function test_manual_promotion_reviews_assigned_subjects_not_unassigned_catalog_entries(): void
    {
        $this->completedYear(1, 50);
        Enrollment::query()->update(['assignment_mode' => 'manual']);
        $this->subject('UNASSIGNED', 'First Semester');
        $result = StudentProgression::evaluate($this->student, '2026-2027', '2027-2028');
        $this->assertTrue($result['eligible']);
        $this->assertTrue($result['requiresReview']);
        $this->assertCount(2, $result['failedSubjects']);
        $this->assertCount(0, $result['incompleteSubjects']);
        $this->assertFalse(collect($result['records'])->contains('code', 'UNASSIGNED'));
    }

    public function test_grade_dropdown_includes_new_enrollment_term_before_grades_are_posted(): void
    {
        $this->completedYear(1, 50);
        Enrollment::create(['student_id' => $this->student->user_id, 'term' => 'First Semester, A.Y. 2027-2028',
            'status' => 'Not Enrolled', 'year_level' => 2, 'program_snapshot' => 'BS IT']);
        Sanctum::actingAs($this->student);
        $this->getJson('/api/grades/terms/student')->assertOk()->assertJsonCount(3)
            ->assertJsonPath('0.courses.0.status', 'Failed')
            ->assertJsonPath('2.academicYear', '2027-2028')->assertJsonPath('2.semester', 'First Semester')
            ->assertJsonPath('2.yearLevel', 2)->assertJsonCount(0, '2.courses');
        $this->assertDatabaseCount('grades', 2);
    }
}
