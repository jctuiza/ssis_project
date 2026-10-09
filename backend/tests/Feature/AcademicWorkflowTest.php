<?php

namespace Tests\Feature;

use App\Models\Clearance;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\AcademicEnrollment;
use App\Support\Rules;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AcademicWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function student(): User
    {
        Cache::flush();
        $role = Role::create(['key' => 'student', 'label' => 'Student']);
        SystemSetting::create(['system_name' => 'SSIS', 'current_term' => '1st Semester, A.Y. 2026-2027']);
        $dept=\App\Models\Department::create(['code'=>'CCS','name'=>'Computing']);
        \App\Models\AcademicProgram::create(['department_id'=>$dept->department_id,'name'=>'BS Information Technology','duration_years'=>4,'active_curriculum'=>'Current','promotion_pass_mark'=>75]);
        $student = User::create(['username' => '2026-test', 'name' => 'Test student', 'email' => 'student@example.test', 'password' => 'test-password', 'role_id' => $role->role_id, 'department_id'=>$dept->department_id]);
        StudentProfile::create(['user_id' => $student->user_id, 'program' => 'BS Information Technology', 'year_level' => '1st Year', 'birthdate' => '2005-01-01', 'address' => 'Test address']);
        Subject::create(['subject_code' => 'IT101', 'name' => 'Computing', 'units' => 3,'department_id'=>\App\Models\Department::where('code','CCS')->value('department_id'),'program'=>'BS Information Technology','year_level'=>1,'semester'=>'First Semester','curriculum'=>'Current']);
        return $student;
    }

    public function test_pending_clearance_blocks_enrollment_but_assessment_exists(): void
    {
        $student = $this->student();
        AcademicEnrollment::prepare($student);
        $this->assertFalse(AcademicEnrollment::enrollIfCleared($student, confirmed: true));
        $this->assertSame('Not Enrolled', Rules::enrollmentStatusOf($student->user_id));
        $this->assertNotNull(Rules::assessmentFor($student->user_id));
        $this->assertDatabaseCount('grades', 0);
    }

    public function test_cleared_student_enrollment_is_confirmed_only_once(): void
    {
        $student = $this->student();
        AcademicEnrollment::prepare($student);
        Clearance::where('student_id', $student->user_id)->update(['status' => 'Cleared']);
        $this->assertTrue(AcademicEnrollment::enrollIfCleared($student, confirmed: true));
        $this->assertFalse(AcademicEnrollment::enrollIfCleared($student, confirmed: true));
        $this->assertSame('Enrolled', Rules::enrollmentStatusOf($student->user_id));
        $this->assertDatabaseCount('grades', 1);
    }

    public function test_closed_enrollment_does_not_auto_enroll(): void
    {
        $student = $this->student();
        AcademicEnrollment::prepare($student);
        Clearance::where('student_id', $student->user_id)->update(['status' => 'Cleared']);
        SystemSetting::first()->update(['enrollment_open' => false]);
        $this->assertFalse(AcademicEnrollment::enrollIfCleared($student, confirmed: true));
    }

    public function test_different_terms_keep_clearance_separate(): void
    {
        $student = $this->student();
        AcademicEnrollment::prepare($student);
        Clearance::where('student_id', $student->user_id)->update(['status' => 'Cleared']);
        SystemSetting::first()->update(['current_term' => '2nd Semester, A.Y. 2025-2026']);
        AcademicEnrollment::prepare($student);
        $this->assertCount(3, Rules::missingClearances($student->user_id, Rules::OFFICES));
        $this->assertDatabaseCount('clearances', 6);
        $this->assertDatabaseCount('enrollments', 2);
    }

    public function test_on_hold_and_missing_office_records_cannot_enroll(): void
    {
        $student = $this->student();
        AcademicEnrollment::prepare($student);
        Clearance::where('student_id', $student->user_id)->update(['status' => 'Cleared']);
        Clearance::where('office', 'Department')->update(['status' => 'On Hold']);
        $this->assertFalse(AcademicEnrollment::enrollIfCleared($student, confirmed: true));
        Clearance::where('office', 'Department')->delete();
        $this->assertFalse(AcademicEnrollment::enrollIfCleared($student, confirmed: true));
    }

    public function test_program_specific_subjects_do_not_leak_to_other_programs(): void
    {
        $student = $this->student();
        Subject::where('subject_code', 'IT101')->update(['program' => 'BS Information Technology']);
        Subject::create(['subject_code' => 'CS101', 'name' => 'Computer Science', 'units' => 3, 'program' => 'BS Computer Science']);
        $this->assertSame(['IT101'], Rules::offeredSubjects($student->department_id, 'BS Information Technology',1)->pluck('subject_code')->all());
    }
    public function test_students_without_subjects_have_known_fees_but_cannot_clear_cashier(): void
    {
        $student = $this->student();
        Subject::query()->delete();
        AcademicEnrollment::prepare($student);
        $assessment = Rules::assessmentFor($student->user_id);
        $this->assertNotNull($assessment);
        $this->assertTrue($assessment->tuition_pending);
        $this->assertSame(0.0, $assessment->tuition);
        $this->assertSame((float) Rules::settings()->misc_fees, $assessment->misc_fees);
        $assessment->update(['misc_fees' => 0]);
        Rules::syncCashierClearance($student->user_id, silent: true);
        $this->assertSame('Pending', Clearance::where('office', 'Cashier')->value('status'));
        $this->assertSame('Unpaid', Rules::paymentStatusOf($assessment->fresh()));
    }

    public function test_pending_tuition_finalizes_once_using_the_original_rate(): void
    {
        $student = $this->student();
        Subject::query()->delete();
        AcademicEnrollment::prepare($student);
        $original = Rules::assessmentFor($student->user_id);
        $rate = $original->tuition_rate;
        \App\Models\Transaction::create([
            'reference_no' => 'TXN-test-misc', 'student_id' => $student->user_id,
            'assessment_id' => $original->assessment_id, 'type' => 'tuition',
            'description' => 'Miscellaneous fees', 'amount' => $original->misc_fees,
            'method' => 'Cash', 'status' => 'Paid', 'paid_at' => now(),
        ]);
        Rules::syncCashierClearance($student->user_id, silent: true);
        $this->assertSame('Pending', Clearance::where('office', 'Cashier')->value('status'));
        $misc = $original->misc_fees;
        SystemSetting::first()->update(['tuition_per_unit' => 9999, 'misc_fees' => 9999]);
        Subject::create(['subject_code' => 'IT102', 'name' => 'Computing', 'units' => 3,'department_id'=>\App\Models\Department::where('code','CCS')->value('department_id'),'program'=>'BS Information Technology','year_level'=>1,'semester'=>'First Semester','curriculum'=>'Current']);
        AcademicEnrollment::prepare($student);
        $assessment = Rules::assessmentFor($student->user_id);
        $this->assertSame($original->assessment_id, $assessment->assessment_id);
        $this->assertFalse($assessment->tuition_pending);
        $this->assertSame(3 * $rate, $assessment->tuition);
        $this->assertSame($misc, $assessment->misc_fees);
        $this->assertSame(3 * $rate, Rules::balanceOf($assessment));
        $this->assertDatabaseCount('transactions', 1);
        AcademicEnrollment::prepare($student);
        $this->assertDatabaseCount('assessments', 1);
    }

    public function test_pending_fees_are_visible_to_student_and_cashier_apis(): void
    {
        $student = $this->student();
        Subject::query()->delete();
        AcademicEnrollment::prepare($student);
        \Laravel\Sanctum\Sanctum::actingAs($student);
        $this->getJson('/api/payments/student/'.$student->username)->assertOk()->assertJsonPath('assessment.tuitionPending', true);
        $this->getJson('/api/enrollment/student/'.$student->username)->assertOk()->assertJsonPath('assessment.tuitionPending', true);

        $role = Role::create(['key' => 'cashier', 'label' => 'Cashier']);
        $permission = \App\Models\Permission::create(['key' => 'payments.manage', 'label' => 'Payments', 'group' => 'Tests']);
        $role->permissions()->attach($permission->permission_id);
        $cashier = User::create(['username' => 'cashier-test', 'name' => 'Cashier', 'email' => 'cashier@example.test', 'password' => 'test-password', 'role_id' => $role->role_id]);
        \Laravel\Sanctum\Sanctum::actingAs($cashier);
        $this->getJson('/api/assessments')->assertOk()->assertJsonCount(1)->assertJsonPath('0.studentId', $student->username);
        $this->getJson('/api/dashboard/cashier')->assertOk()->assertJsonPath('totals.pending', 1);
    }
    public function test_clearance_and_sync_do_not_enroll_without_student_confirmation(): void
    {
        $student = $this->student();
        AcademicEnrollment::prepare($student);
        Rules::assessmentFor($student->user_id)->update(['tuition' => 0, 'misc_fees' => 0]);
        Clearance::where('student_id', $student->user_id)->update(['status' => 'Cleared']);
        AcademicEnrollment::syncAll();
        $this->assertFalse(AcademicEnrollment::enrollIfCleared($student));
        $this->assertSame('Not Enrolled', Rules::enrollmentStatusOf($student->user_id));
        \Laravel\Sanctum\Sanctum::actingAs($student);
        $this->postJson('/api/enrollment')->assertStatus(422);
        $this->assertSame('Not Enrolled', Rules::enrollmentStatusOf($student->user_id));
        $this->postJson('/api/enrollment', ['confirmed' => true])->assertOk();
        $this->assertSame('Enrolled', Rules::enrollmentStatusOf($student->user_id));
    }
}
