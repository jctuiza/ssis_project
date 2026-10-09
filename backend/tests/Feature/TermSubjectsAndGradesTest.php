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
use Tests\TestCase;

class TermSubjectsAndGradesTest extends TestCase
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

    public function test_admin_semester_change_and_later_subject_additions_refresh_student_assignments(): void
    {
        $this->subject('FIRST', 'First Semester');
        AcademicEnrollment::prepare($this->student);
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/settings', ['systemName' => 'SSIS', 'currentTerm' => '2nd Semester, A.Y. 2026-2027', 'enrollmentOpen' => true])->assertOk();
        Sanctum::actingAs($this->staff);
        foreach (['SECOND1', 'SECOND2'] as $code) {
            $this->postJson('/api/subjects', ['code' => $code, 'name' => 'Second semester subject', 'units' => 3,
                'program' => 'BS IT', 'yearLevel' => 1, 'semester' => 'Second Semester', 'academicYear' => '2026-2027'])->assertOk();
        }
        $this->subject('WRONGYEAR', 'Second Semester', 2);
        $this->subject('WRONGAY', 'Second Semester', 1, '2025-2026');
        $this->subject('WRONGPROGRAM', 'Second Semester')->update(['program' => 'Other program']);
        $otherDepartment = Department::create(['code' => 'CBA', 'name' => 'Business']);
        $this->subject('WRONGDEPT', 'Second Semester')->update(['department_id' => $otherDepartment->department_id]);
        Sanctum::actingAs($this->student);
        $url = '/api/enrollment/student/'.$this->student->username;
        $this->getJson($url)->assertOk()->assertJsonCount(2, 'subjects')->assertJsonPath('totalUnits', 6)->assertJsonPath('assessment.tuition', 6000);
        $this->getJson($url)->assertOk()->assertJsonCount(2, 'subjects');
        $this->assertDatabaseCount('enrollment_subjects', 3);
        $this->assertDatabaseCount('enrollments', 2);
        $this->assertDatabaseCount('grades', 0);
    }

    public function test_current_enrolled_additions_preserve_existing_grades_and_historical_snapshots(): void
    {
        $this->completedYear();
        AcademicEnrollment::prepare($this->student);
        $this->subject('LATE', 'Second Semester');
        AcademicEnrollment::prepare($this->student);
        AcademicEnrollment::prepare($this->student);
        $this->assertSame(['Y1S1', 'LATE'], Rules::subjectCodesOf(Rules::enrollmentFor($this->student->user_id)));
        $this->assertDatabaseCount('grades', 3);
        $this->assertSame(60.0, Grade::where('course_code', 'Y1S1')->first()->prelim);
        $this->assertSame(6000.0, Rules::assessmentFor($this->student->user_id)->tuition);
        $first = Enrollment::where('term', 'First Semester, A.Y. 2026-2027')->first();
        $this->assertSame(['Y1S0'], Rules::subjectCodesOf($first));
        $this->assertSame(3, Rules::enrollmentUnits($first));
    }

    public function test_grade_boundary_statuses_are_derived_and_validation_preserves_other_periods(): void
    {
        $this->completedYear();
        $grade = Grade::first();
        Sanctum::actingAs($this->staff);
        $url = '/api/grades/'.$grade->grade_id;
        foreach ([0 => 'Failed', 59 => 'Failed', 60 => 'Passed', 100 => 'Passed'] as $mark => $status) {
            $this->patchJson($url, ['prelim' => $mark, 'midterm' => $mark, 'finals' => $mark])->assertOk()->assertJsonPath('status', $status);
        }
        $this->patchJson($url, ['finals' => null])->assertOk()->assertJsonPath('status', 'Incomplete')->assertJsonPath('prelim', 100);
        $this->patchJson($url, ['prelim' => -1])->assertUnprocessable();
        $this->patchJson($url, ['finals' => 101])->assertUnprocessable();
        $this->patchJson($url, ['status' => 'Passed'])->assertUnprocessable();
        Sanctum::actingAs($this->student);
        $this->getJson('/api/grades/terms/'.$this->student->username)->assertOk()->assertJsonPath('0.courses.0.status', 'Incomplete');
    }

    public static function promotionYears(): array
    {
        return [[1], [2], [3], [4]];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('promotionYears')]
    public function test_each_year_advances_once_and_new_year_subjects_use_updated_profile(int $year): void
    {
        $this->completedYear($year);
        $this->subject('NEXTYEAR', 'First Semester', $year + 1, '2027-2028');
        Sanctum::actingAs($this->admin);
        $target = '1st Semester, A.Y. 2027-2028';
        $this->postJson('/api/academic/promotions/preview', ['targetTerm' => $target])->assertOk()->assertJsonPath('students.0.eligible', true)->assertJsonPath('students.0.toYear', $year + 1)->assertJsonCount(2, 'students.0.records');
        $payload = ['targetTerm' => $target, 'sourceTerm' => Rules::currentTerm(), 'studentIds' => [$this->student->user_id], 'reviewed' => true];
        $this->postJson('/api/academic/promotions/activate', $payload)->assertOk();
        $this->postJson('/api/academic/promotions/activate', $payload)->assertStatus(409);
        $this->assertDatabaseHas('student_profiles', ['user_id' => $this->student->user_id, 'year_level' => AcademicAssignments::label($year + 1)]);
        $this->assertDatabaseCount('student_promotions', 1);
        $this->assertDatabaseCount('grades', 2);
        $this->assertSame(['NEXTYEAR'], Rules::subjectCodesOf(Rules::enrollmentFor($this->student->user_id)));
        $this->assertFalse(SystemSetting::first()->enrollment_open);
    }

    public function test_fifth_year_remains_and_failed_records_are_available_for_review(): void
    {
        $this->completedYear(5, 50);
        $review = StudentProgression::evaluate($this->student, '2026-2027', '2027-2028');
        $this->assertFalse($review['eligible']);
        $this->assertSame(5, $review['toYear']);
        $this->assertCount(2, $review['failedSubjects']);
        $this->assertCount(2, $review['records']);
    }

    public function test_failed_student_cannot_be_forced_into_promotion_and_new_entrant_stays_first_year(): void
    {
        $this->completedYear(1, 50);
        Sanctum::actingAs($this->admin);
        $target = '1st Semester, A.Y. 2027-2028';
        $payload = ['targetTerm' => $target, 'sourceTerm' => Rules::currentTerm(), 'studentIds' => [$this->student->user_id], 'reviewed' => true];
        $this->postJson('/api/academic/promotions/activate', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('student_promotions', 0);
        $this->assertDatabaseHas('system_settings', ['current_term' => '2nd Semester, A.Y. 2026-2027']);
        StudentProfile::first()->update(['admission_term' => $target]);
        $this->assertStringContainsString('New entrant', StudentProgression::evaluate($this->student, '2026-2027', '2027-2028')['reason']);
        $payload['studentIds'] = [];
        $this->postJson('/api/academic/promotions/activate', $payload)->assertOk();
        $this->assertDatabaseHas('student_profiles', ['user_id' => $this->student->user_id, 'year_level' => '1st Year']);
    }

    public function test_all_five_years_and_recurring_subjects_are_scoped_without_curriculum(): void
    {
        for ($year = 1; $year <= 5; $year++) {
            $this->subject('YEAR'.$year, 'Second Semester', $year, null);
        }
        for ($year = 1; $year <= 5; $year++) {
            $this->assertSame(['YEAR'.$year], Rules::offeredSubjects($this->department, 'BS IT', $year, '2nd Semester, A.Y. 2027-2028')->pluck('subject_code')->all());
            $this->assertCount(0, Rules::offeredSubjects($this->department, 'BS IT', $year, '1st Semester, A.Y. 2027-2028'));
        }
        $this->assertSame('Failed', Resources::gradeStatus(59.99));
        $this->assertSame('Passed', Resources::gradeStatus(60));
    }
}
