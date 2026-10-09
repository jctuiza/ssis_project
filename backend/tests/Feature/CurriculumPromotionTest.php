<?php
namespace Tests\Feature;
use App\Models\{AcademicProgram, Department, Role, Permission, User, StudentProfile, Subject, Enrollment, EnrollmentSubject, Grade, SystemSetting};
use App\Support\{Rules, StudentProgression};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class CurriculumPromotionTest extends TestCase {
    use RefreshDatabase;
    private User $student;
    private User $admin;
    private int $department;
    protected function setUp(): void {
        parent::setUp();Cache::flush();
        $this->department=Department::create(['code'=>'CCS','name'=>'Computing'])->department_id;
        $role=Role::create(['key'=>'student','label'=>'Student']);
        $adminRole=Role::create(['key'=>'admin','label'=>'Admin']);
        $permission=Permission::firstOrCreate(['key'=>'settings.manage'],['label'=>'Settings','group'=>'Tests']);$adminRole->permissions()->attach($permission->permission_id);
        AcademicProgram::create(['department_id'=>$this->department,'name'=>'BS IT','duration_years'=>4,'active_curriculum'=>'Current','promotion_pass_mark'=>75]);
        SystemSetting::create(['system_name'=>'SSIS','current_term'=>'2nd Semester, A.Y. 2026-2027','enrollment_open'=>false]);
        $this->student=User::create(['username'=>'2026-0001','name'=>'Student','email'=>'s@example.test','password'=>'password-123','role_id'=>$role->role_id,'department_id'=>$this->department,'status'=>'Active','must_change_password'=>false]);
        $this->admin=User::create(['username'=>'admin','name'=>'Admin','email'=>'a@example.test','password'=>'password-123','role_id'=>$adminRole->role_id,'status'=>'Active','must_change_password'=>false]);
        StudentProfile::create(['user_id'=>$this->student->user_id,'program'=>'BS IT','year_level'=>'1st Year','birthdate'=>'2006-01-01','curriculum'=>'Current']);
    }
    private function completeYear(): void {
        foreach (['First Semester','Second Semester'] as $i=>$semester) {
            $code='IT10'.$i;
            Subject::create(['subject_code'=>$code,'name'=>'Computing','units'=>3,'department_id'=>$this->department,'program'=>'BS IT','year_level'=>1,'semester'=>$semester,'curriculum'=>'Current']);
            $enrollment=Enrollment::create(['student_id'=>$this->student->user_id,'term'=>($i ? '2nd' : '1st').' Semester, A.Y. 2026-2027','status'=>'Enrolled','year_level'=>1,'program_snapshot'=>'BS IT','curriculum_snapshot'=>'Current']);
            EnrollmentSubject::create(['enrollment_id'=>$enrollment->enrollment_id,'subject_code'=>$code,'subject_name'=>'Computing','units'=>3]);
            Grade::create(['student_id'=>$this->student->user_id,'course_code'=>$code,'description'=>'Computing','units'=>3,'academic_year'=>'2026-2027','semester'=>$semester,'prelim'=>80,'midterm'=>80,'finals'=>80]);
        }
    }
    public function test_subject_selection_requires_matching_year_semester_and_explicit_sharing(): void {
        $this->completeYear();
        $this->assertSame(['IT100'],Rules::offeredSubjects($this->department,'BS IT',1,'1st Semester, A.Y. 2026-2027')->pluck('subject_code')->all());
        $this->assertCount(0,Rules::offeredSubjects($this->department,'BS IT',2));
        Subject::find('IT101')->update(['shared_year_levels'=>[2]]);
        $this->assertSame(['IT101'],Rules::offeredSubjects($this->department,'BS IT',2)->pluck('subject_code')->all());
        $this->assertSame(['IT101'],Rules::offeredSubjects($this->department,'BS IT',2,null,'Different')->pluck('subject_code')->all());
    }
    public function test_promotion_is_reviewed_once_and_preserves_records(): void {
        $this->completeYear();Sanctum::actingAs($this->admin);
        $target='1st Semester, A.Y. 2027-2028';
        $this->postJson('/api/academic/promotions/preview',['targetTerm'=>$target])->assertOk()->assertJsonPath('students.0.eligible',true);
        $payload=['targetTerm'=>$target,'sourceTerm'=>Rules::currentTerm(),'studentIds'=>[$this->student->user_id],'reviewed'=>true];
        $this->postJson('/api/academic/promotions/activate',$payload)->assertOk();
        $this->postJson('/api/academic/promotions/activate',$payload)->assertStatus(409);
        $this->assertDatabaseHas('student_profiles',['user_id'=>$this->student->user_id,'year_level'=>'2nd Year']);
        $this->assertDatabaseCount('student_promotions',1);$this->assertDatabaseCount('grades',2);$this->assertDatabaseCount('enrollments',3);
        $this->assertFalse(SystemSetting::first()->enrollment_open);
    }
    public function test_failing_incomplete_and_new_entry_records_are_held(): void {
        $this->assertFalse(StudentProgression::evaluate($this->student,'2026-2027','2027-2028')['eligible']);
        $this->completeYear();Grade::first()->update(['finals'=>null]);
        $this->assertFalse(StudentProgression::evaluate($this->student,'2026-2027','2027-2028')['eligible']);
        Grade::first()->update(['prelim'=>50,'midterm'=>50,'finals'=>50]);
        $this->assertFalse(StudentProgression::evaluate($this->student,'2026-2027','2027-2028')['eligible']);
        StudentProfile::first()->update(['admission_term'=>'1st Semester, A.Y. 2027-2028']);
        $this->assertStringContainsString('New entrant',StudentProgression::evaluate($this->student,'2026-2027','2027-2028')['reason']);
    }
    public function test_department_cannot_activate_year_and_fifth_year_remains_final(): void {
        $this->completeYear();StudentProfile::first()->update(['year_level'=>'5th Year']);
        $this->assertStringContainsString('Fifth Year is the final level',StudentProgression::evaluate($this->student,'2026-2027','2027-2028')['reason']);
        Sanctum::actingAs($this->student);
        $this->postJson('/api/academic/promotions/activate',['targetTerm'=>'1st Semester, A.Y. 2027-2028'])->assertForbidden();
    }
    public function test_grade_year_filter_uses_enrollment_snapshot_after_promotion(): void {
        $this->completeYear();
        $role=Role::create(['key'=>'department','label'=>'Department']);
        $permission=Permission::firstOrCreate(['key'=>'grades.manage'],['label'=>'Grades','group'=>'Tests']);$role->permissions()->attach($permission->permission_id);
        $staff=User::create(['username'=>'ccs','name'=>'CCS staff','email'=>'ccs@example.test','password'=>'password-123','role_id'=>$role->role_id,'department_id'=>$this->department,'status'=>'Active','must_change_password'=>false]);
        StudentProfile::first()->update(['year_level'=>'2nd Year']);Sanctum::actingAs($staff);
        $this->getJson('/api/grades?program=BS%20IT&academic_year=2026-2027&semester=First%20Semester&year_level=1')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/grades?program=BS%20IT&academic_year=2026-2027&semester=First%20Semester&year_level=2')->assertOk()->assertJsonCount(0);
    }

    public function test_subject_creation_assigns_actor_department_and_rejects_invalid_year(): void {
        $role=Role::create(['key'=>'department','label'=>'Department']);
        $permission=Permission::firstOrCreate(['key'=>'subjects.manage'],['label'=>'Subjects','group'=>'Tests']);$role->permissions()->attach($permission->permission_id);
        $staff=User::create(['username'=>'ccs','name'=>'CCS staff','email'=>'ccs@example.test','password'=>'password-123','role_id'=>$role->role_id,'department_id'=>$this->department,'status'=>'Active','must_change_password'=>false]);
        Sanctum::actingAs($staff);
        $payload=['code'=>'IT201','name'=>'Advanced computing','units'=>3,'program'=>'BS IT','yearLevel'=>2,'sharedYearLevels'=>[3],'semester'=>'First Semester','curriculum'=>'Current'];
        $this->postJson('/api/subjects',$payload)->assertOk()->assertJsonPath('departmentId',$this->department)->assertJsonPath('yearLevel',2);
        $this->getJson('/api/subjects?year_level=1')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/subjects?year_level=3')->assertOk()->assertJsonCount(1);
        $payload['code']='IT501';$payload['yearLevel']=5;
        $this->postJson('/api/subjects',$payload)->assertOk()->assertJsonPath('yearLevel',5);
        $payload['departmentId']=999;
        $this->postJson('/api/subjects',$payload)->assertForbidden();
    }

}
