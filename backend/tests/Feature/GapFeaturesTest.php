<?php

namespace Tests\Feature;

use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use App\Models\Grade;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Subject;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\Rules;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GapFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        foreach (['admin', 'registrar', 'student', 'cashier', 'department'] as $key) {
            Role::create(['key' => $key, 'label' => ucfirst($key)]);
        }
        foreach (['enrollment.manage', 'settings.manage', 'grades.manage', 'payments.manage', 'subjects.manage'] as $key) {
            Permission::firstOrCreate(['key' => $key], ['label' => $key, 'group' => 'Tests']);
        }
        Role::where('key', 'registrar')->first()->permissions()->sync(Permission::whereIn('key', ['enrollment.manage'])->pluck('permission_id'));
        Role::where('key', 'admin')->first()->permissions()->sync(Permission::where('key', 'settings.manage')->pluck('permission_id'));
        Role::where('key', 'cashier')->first()->permissions()->sync(Permission::where('key', 'payments.manage')->pluck('permission_id'));
        Role::where('key','department')->first()->permissions()->sync(Permission::whereIn('key',['grades.manage','subjects.manage'])->pluck('permission_id'));
        \App\Models\Department::create(['code'=>'CCS','name'=>'College of Computer Studies']);
        (new \Database\Seeders\AcademicProgramSeeder)->run();
        \App\Models\AcademicProgram::query()->update(['duration_years'=>4,'promotion_pass_mark'=>75]);
        SystemSetting::create(['system_name' => 'SSIS', 'current_term' => '1st Semester, A.Y. 2026–2027']);
    }

    private function user(string $role, string $username): User
    {
        return User::create([
            'username' => $username, 'name' => $username, 'email' => $username.'@example.test',
            'password' => 'test-password', 'role_id' => Role::where('key', $role)->value('role_id'),
            'must_change_password' => false, 'department_id'=>\App\Models\Department::where('code','CCS')->value('department_id'),
        ]);
    }

    private function enrolled(User $student): Enrollment
    {
        $subject = Subject::create(['subject_code' => 'IT101', 'name' => 'Computing', 'units' => 3, 'department_id'=>1, 'program'=>'BS Information Technology','year_level'=>1,'semester'=>'First Semester','curriculum'=>'Current']);
        $enrollment = Enrollment::create(['student_id' => $student->user_id, 'term' => Rules::currentTerm(), 'status' => 'Enrolled']);
        EnrollmentSubject::create([
            'enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $subject->subject_code,
            'subject_name' => $subject->name, 'units' => $subject->units, 'schedule' => null,
        ]);
        return $enrollment;
    }

    public function test_subject_crud_is_scoped_to_department_permission(): void
    {
        Sanctum::actingAs($this->user('department', 'department-test'));
        $this->postJson('/api/subjects', ['code' => 'IT101', 'name' => 'Computing', 'units' => 3, 'departmentId'=>1, 'program'=>'BS Information Technology','yearLevel'=>1,'semester'=>'First Semester','curriculum'=>'Current'])->assertOk()->assertJsonPath('code', 'IT101');
        $this->getJson('/api/subjects')->assertOk()->assertJsonCount(1);
        $this->patchJson('/api/subjects/IT101', ['name' => 'Web Development', 'units' => 4, 'departmentId'=>1, 'program'=>'BS Information Technology','yearLevel'=>1,'semester'=>'First Semester','curriculum'=>'Current'])->assertOk()->assertJsonPath('name', 'Web Development');
        $this->deleteJson('/api/subjects/IT101')->assertOk();
        $this->assertDatabaseMissing('subjects', ['subject_code' => 'IT101']);
    }

    public function test_student_cannot_manage_subjects(): void
    {
        Sanctum::actingAs($this->user('student', 'student-test'));
        $this->getJson('/api/subjects')->assertForbidden();
        $this->postJson('/api/subjects', ['code' => 'IT101', 'name' => 'Computing', 'units' => 3])->assertForbidden();
    }

    public function test_invalid_subject_department_is_rejected(): void
    {
        Sanctum::actingAs($this->user('department', 'department-test'));
        $this->postJson('/api/subjects', ['code' => 'IT101', 'name' => 'Computing', 'units' => 3, 'departmentId' => 'invalid'])->assertStatus(403);
        $this->postJson('/api/subjects', ['code' => 'IT101', 'name' => 'Computing', 'units' => 1.5])->assertStatus(422);
    }

    public function test_grade_creation_is_idempotent_and_preserves_posted_grades(): void
    {
        $student = $this->user('student', 'student-test');
        $this->enrolled($student);
        $this->assertSame(1, Rules::createGradeRows($student));
        $grade = Grade::firstOrFail();
        $grade->update(['prelim' => 88]);
        $this->assertSame(0, Rules::createGradeRows($student));
        $this->assertSame(88.0, $grade->fresh()->prelim);
        $this->artisan('ssis:create-grades')->assertSuccessful();
        $this->assertDatabaseCount('grades', 1);
    }

    public function test_manual_enrollment_approval_is_disabled(): void
    {
        $student = $this->user('student', 'student-test');
        $enrollment = $this->enrolled($student);
        $enrollment->update(['status' => 'Not Enrolled']);
        Sanctum::actingAs($this->user('registrar', 'registrar-test'));
        $this->patchJson('/api/enrollment/'.$enrollment->enrollment_id, ['status' => 'Enrolled'])->assertStatus(409);
        $this->assertDatabaseCount('grades', 0);
    }

    public function test_historical_enrollment_uses_its_own_term_for_grades(): void
    {
        $student = $this->user('student', 'student-test');
        $enrollment = $this->enrolled($student);
        $enrollment->update(['term' => '2nd Semester, A.Y. 2025-2026']);
        $this->assertSame(1, Rules::createGradeRows($student, $enrollment));
        $this->assertDatabaseHas('grades', ['academic_year' => '2025-2026', 'semester' => 'Second Semester']);
    }

    public function test_catalog_edits_preserve_enrollment_and_grade_snapshots(): void
    {
        $student = $this->user('student', 'student-test');
        $enrollment = $this->enrolled($student);
        Sanctum::actingAs($this->user('department', 'department-test'));
        $this->patchJson('/api/subjects/IT101', ['name' => 'New catalog name', 'units' => 5, 'departmentId'=>1, 'program'=>'BS Information Technology','yearLevel'=>1,'semester'=>'First Semester','curriculum'=>'Current'])->assertOk();
        $this->assertSame(3, Rules::enrollmentUnits($enrollment));
        Rules::createGradeRows($student);
        $this->assertDatabaseHas('grades', ['course_code'=>'IT101','description'=>'Computing','units'=>3]);
        $this->deleteJson('/api/subjects/IT101')->assertStatus(422);
    }

    public function test_fee_changes_invalidate_settings_and_preserve_existing_assessments(): void
    {
        $student = $this->user('student', 'student-test');
        $this->enrolled($student);
        $original = Rules::ensureAssessment($student);
        $this->assertSame(4500.0, $original->tuition);
        Sanctum::actingAs($this->user('admin', 'admin-test'));
        $this->putJson('/api/settings', [
            'systemName' => 'SSIS', 'currentTerm' => Rules::currentTerm(),
            'enrollmentOpen' => true, 'documentRequestsOpen' => true,
            'tuitionPerUnit' => 2000, 'miscFees' => 7000,
        ])->assertOk()->assertJsonPath('tuitionPerUnit', 2000);
        $this->assertSame(2000.0, Rules::settings()->tuition_per_unit);
        $this->assertSame(4500.0, $original->fresh()->tuition);
        $other = $this->user('student', 'second-student');
        $enrollment = Enrollment::create(['student_id' => $other->user_id, 'term' => Rules::currentTerm(), 'status' => 'Enrolled']);
        EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => 'IT101', 'subject_name' => 'Computing', 'units' => 3]);
        $updated = Rules::ensureAssessment($other);
        $this->assertSame(6000.0, $updated->tuition);
        $this->assertSame(7000.0, $updated->misc_fees);
        $this->assertDatabaseCount('assessments', 2);
    }

    public function test_negative_fee_is_rejected(): void
    {
        Sanctum::actingAs($this->user('admin', 'admin-test'));
        $this->putJson('/api/settings', ['systemName' => 'SSIS', 'currentTerm' => Rules::currentTerm(), 'tuitionPerUnit' => -1])->assertStatus(422);
    }

    public function test_public_roles_are_cached_and_model_changes_invalidate_them(): void
    {
        $this->getJson('/api/roles/public')->assertOk()->assertHeader('X-Cache', 'MISS');
        $this->getJson('/api/roles/public')->assertOk()->assertHeader('X-Cache', 'HIT');
        Role::where('key', 'registrar')->first()->update(['label' => 'Updated Registrar']);
        $this->getJson('/api/roles/public')->assertOk()->assertHeader('X-Cache', 'MISS');
    }
    public function test_cashier_sees_unpaid_students_before_any_transaction_exists(): void
    {
        $student = $this->user('student', 'student-pending');
        $enrollment = $this->enrolled($student);
        $enrollment->update(['status' => 'Not Enrolled']);
        Rules::ensureAssessment($student);
        Sanctum::actingAs($this->user('cashier', 'cashier-pending'));

        $this->assertDatabaseCount('transactions', 0);
        $this->getJson('/api/dashboard/cashier')->assertOk()->assertJsonPath('totals.pending', 1);
        $this->getJson('/api/assessments')->assertOk()->assertJsonCount(1)->assertJsonPath('0.status', 'Unpaid');

        $assessment = Rules::assessmentFor($student->user_id);
        $this->postJson('/api/assessments/'.$assessment->assessment_id.'/payments', ['amount' => 100, 'method' => 'Cash'])->assertOk();
        $this->getJson('/api/dashboard/cashier')->assertOk()->assertJsonPath('totals.pending', 1);
        $this->postJson('/api/assessments/'.$assessment->assessment_id.'/payments', ['amount' => Rules::balanceOf($assessment), 'method' => 'Cash'])->assertOk();
        $this->getJson('/api/dashboard/cashier')->assertOk()->assertJsonPath('totals.pending', 0);
    }

    public function test_cashier_current_term_list_excludes_historical_assessments(): void
    {
        $student = $this->user('student', 'student-history');
        $this->enrolled($student);
        Rules::ensureAssessment($student);
        \App\Models\Assessment::create(['student_id' => $student->user_id, 'term' => '2nd Semester, A.Y. 2025-2026', 'tuition' => 1000, 'misc_fees' => 0]);
        Sanctum::actingAs($this->user('cashier', 'cashier-history'));

        $this->getJson('/api/assessments')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/dashboard/cashier')->assertOk()->assertJsonPath('totals.pending', 1);
    }
}
