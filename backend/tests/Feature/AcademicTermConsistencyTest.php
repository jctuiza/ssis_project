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
use App\Support\Rules;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicTermConsistencyTest extends TestCase
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

    public function test_active_term_ignores_stale_shared_cache_in_every_portal(): void
    {
        $settings = SystemSetting::first();
        Cache::put('ssis:settings:attributes:v1', $settings->getAttributes(), 600);
        DB::table('system_settings')->update(['current_term' => 'First Semester, A.Y. 2027-2028']);
        $this->subject('NEWYEAR', 'First Semester', 1, '2027-2028');
        foreach ([$this->admin, $this->staff, $this->student] as $actor) {
            Sanctum::actingAs($actor);
            $this->getJson('/api/settings')->assertOk()->assertJsonPath('currentTerm', 'First Semester, A.Y. 2027-2028');
        }
        Sanctum::actingAs($this->student);
        $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonPath('term', '1st Semester, A.Y. 2027-2028')
            ->assertJsonPath('subjects.0.code', 'NEWYEAR');
    }

    public function test_future_academic_records_do_not_set_the_active_enrollment_term(): void
    {
        $this->subject('CURRENT', 'First Semester');
        Enrollment::create(['student_id' => $this->student->user_id, 'term' => 'First Semester, A.Y. 2027-2028', 'status' => 'Enrolled', 'year_level' => 1, 'program_snapshot' => 'BS IT']);
        Sanctum::actingAs($this->student);
        $this->getJson('/api/settings')->assertOk()->assertJsonPath('currentTerm', '1st Semester, A.Y. 2026-2027');
        $this->getJson('/api/enrollment/student/student')->assertOk()->assertJsonPath('term', '1st Semester, A.Y. 2026-2027')
            ->assertJsonPath('subjects.0.code', 'CURRENT');
    }

    public function test_stale_settings_draft_cannot_revert_the_semester(): void
    {
        Sanctum::actingAs($this->admin);
        $source = Rules::currentTerm();
        $this->putJson('/api/settings', ['systemName' => 'SSIS', 'sourceTerm' => $source, 'currentTerm' => 'Second Semester, A.Y. 2026-2027', 'enrollmentOpen' => true])->assertOk();
        $this->putJson('/api/settings', ['systemName' => 'Old draft', 'sourceTerm' => $source, 'currentTerm' => $source, 'enrollmentOpen' => true])->assertStatus(409);
        $this->assertSame('Second Semester', Rules::termParts(Rules::currentTerm())[1]);
        $this->assertSame('SSIS', SystemSetting::first()->system_name);
    }

    public function test_settings_and_term_roll_back_if_enrollment_synchronization_fails(): void
    {
        $this->subject('NEWSECOND', 'Second Semester');
        Sanctum::actingAs($this->admin);
        EnrollmentSubject::creating(fn () => throw new \RuntimeException('Simulated synchronization failure'));
        try {
            $this->putJson('/api/settings', ['systemName' => 'Changed', 'sourceTerm' => Rules::currentTerm(), 'currentTerm' => 'Second Semester, A.Y. 2026-2027', 'enrollmentOpen' => true])->assertStatus(500);
        } finally {
            EnrollmentSubject::flushEventListeners();
        }
        $this->assertSame('1st Semester, A.Y. 2026-2027', Rules::currentTerm());
        $this->assertSame('SSIS', SystemSetting::first()->system_name);
        $this->assertDatabaseCount('enrollments', 0);
    }
}
