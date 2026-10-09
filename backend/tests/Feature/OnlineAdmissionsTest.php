<?php
namespace Tests\Feature;
use App\Models\{User,Role,Permission,Department,StudentProfile,Subject,SystemSetting,AdmissionApplication,Assessment,Clearance,Enrollment,Grade,Notification,ActivityLog};
use App\Support\{Rules,AcademicEnrollment};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\{Cache,DB,Mail,Hash};
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class OnlineAdmissionsTest extends TestCase {
    use RefreshDatabase;
    private int $dept;
    protected function setUp(): void {
        parent::setUp(); Cache::flush();
        foreach(['student','registrar','department','cashier','admin'] as $key) Role::create(['key'=>$key,'label'=>ucfirst($key)]);
        foreach(['enrollment.manage','subjects.manage','grades.manage','students.view','logs.view','users.manage','payments.manage'] as $key) Permission::firstOrCreate(['key'=>$key],['label'=>$key,'group'=>'Tests']);
        foreach(['registrar'=>['enrollment.manage','students.view'],'department'=>['grades.manage','subjects.manage','students.view'],'cashier'=>['payments.manage'],'admin'=>['logs.view','users.manage']] as $role=>$keys) Role::where('key',$role)->first()->permissions()->sync(Permission::whereIn('key',$keys)->pluck('permission_id'));
        $this->dept=Department::create(['code'=>'CCS','name'=>'Computing'])->department_id;
        Department::create(['code'=>'CBAA','name'=>'Business']);
        (new \Database\Seeders\AcademicProgramSeeder)->run();
        \App\Models\AcademicProgram::query()->update(['duration_years'=>4,'promotion_pass_mark'=>75]);
        SystemSetting::create(['system_name'=>'SSIS','current_term'=>'1st Semester, A.Y. 2026-2027','enrollment_open'=>true,'tuition_per_unit'=>1000,'misc_fees'=>500]);
        Subject::create(['subject_code'=>'IT101','name'=>'Computing','units'=>3,'department_id'=>$this->dept,'program'=>'BS Information Technology','year_level'=>1,'semester'=>'First Semester','curriculum'=>'Current']);
    }
    private function user(string $role,string $name,?int $dept=null): User {
        return User::create(['username'=>$name,'email'=>$name.'@example.test','name'=>$name,'password'=>'test-password','role_id'=>Role::where('key',$role)->value('role_id'),'department_id'=>$dept,'status'=>'Active','must_change_password'=>false]);
    }
    private function payload(): array { return ['firstName'=>'Alex','lastName'=>'Applicant','middleName'=>'','gender'=>'Male','birthdate'=>'2008-01-01','contact'=>'09123456789','email'=>'alex@example.test','departmentId'=>$this->dept,'program'=>'BS Information Technology']; }
    private function apply(): array { $receipt=$this->postJson('/api/admissions',$this->payload())->assertCreated()->json(); $receipt['application']['id']=AdmissionApplication::where('reference',$receipt['application']['reference'])->value('id'); return $receipt; }
    private function accept(array $receipt): User {
        Sanctum::actingAs($this->user('registrar','registrar'));
        $response=$this->patchJson('/api/admissions/'.$receipt['application']['id'],['status'=>'Accepted'])->assertOk();
        $credentials=$response->json('credentials');
        $student=User::where('email','alex@example.test')->firstOrFail();
        $this->assertSame($student->username,$credentials['studentNumber']);
        $this->assertSame($student->username,$credentials['username']);
        $this->assertTrue(Hash::check($credentials['temporaryPassword'],$student->password));
        return User::where('email','alex@example.test')->firstOrFail();
    }
    public function test_submission_dates_and_duplicates_are_server_controlled(): void {
        $receipt=$this->apply();$this->assertDatabaseCount('admission_applications',1);$this->assertDatabaseCount('users',0);
        $this->postJson('/api/admissions',$this->payload())->assertUnprocessable();
        $alternate=$this->payload();$alternate['email']='different@example.test';
        $this->postJson('/api/admissions',$alternate)->assertUnprocessable();
        $this->assertNotNull(AdmissionApplication::first()->created_at);
        $this->assertArrayNotHasKey('access_hash',$receipt['application']);
        $this->assertArrayNotHasKey('accessKey',$receipt);
    }
    public function test_acceptance_enrolls_once_and_credentials_are_private_one_time(): void {
        $receipt=$this->apply();$student=$this->accept($receipt);
        $this->assertTrue($student->must_change_password);
        $this->assertDatabaseHas('enrollments',['student_id'=>$student->user_id,'status'=>'Enrolled']);
        $this->assertNotNull(StudentProfile::find($student->user_id)->enrolled_on);
        $this->assertDatabaseCount('grades',1);$this->assertDatabaseCount('assessments',1);
        $this->patchJson('/api/admissions/'.$receipt['application']['id'],['status'=>'Accepted'])->assertStatus(409);
        $this->assertDatabaseCount('assessments',1);
        $this->getJson('/api/admissions')->assertOk()->assertJsonMissingPath('0.credentials');
        $this->postJson('/api/admissions/'.$receipt['application']['id'].'/registrar-credentials')->assertOk()->assertJsonPath('credentials.studentNumber',$student->username);
        $this->postJson('/api/admissions/status',[])->assertNotFound();
        $this->postJson('/api/admissions/credentials',[])->assertNotFound();
    }
    public function test_decline_creates_no_student_and_expired_credentials_are_not_returned(): void {
        $receipt=$this->apply();Sanctum::actingAs($this->user('registrar','reg'));
        $this->patchJson('/api/admissions/'.$receipt['application']['id'],['status'=>'Declined','note'=>'Please contact admissions.'])->assertOk();
        $this->assertDatabaseCount('student_profiles',0);$this->assertDatabaseCount('assessments',0);
        $this->assertDatabaseHas('admission_applications',['status'=>'Declined','student_id'=>null]);
    }
    public function test_first_year_exemption_ends_when_term_changes_and_fees_remain_due(): void {
        $receipt=$this->apply();$student=$this->accept($receipt);
        AcademicEnrollment::prepare($student);
        $this->assertSame(3,Clearance::where('student_id',$student->user_id)->where('status','Cleared')->count());
        $a=Rules::assessmentFor($student->user_id);$this->assertSame(3500.0,Rules::balanceOf($a));
        for($i=0;$i<3;$i++) Rules::ensureAssessment($student);
        $this->assertDatabaseCount('assessments',1);$this->assertSame(3500.0,Rules::balanceOf($a->fresh()));
        SystemSetting::first()->update(['current_term'=>'2nd Semester, A.Y. 2026-2027']);
        AcademicEnrollment::prepare($student);
        $this->assertCount(3,Rules::missingClearances($student->user_id,Rules::OFFICES));
        $this->assertDatabaseCount('assessments',2);
    }
    public function test_expired_credential_payload_is_never_returned(): void {
        $receipt=$this->apply();$this->accept($receipt);
        AdmissionApplication::first()->update(['credentials_expires_at'=>now()->subMinute()]);
        $this->postJson('/api/admissions/'.$receipt['application']['id'].'/registrar-credentials')->assertUnprocessable();
    }
    public function test_department_grade_access_is_scoped_to_student_and_term(): void {
        $other=Department::where('code','CBAA')->value('department_id');
        $student=$this->user('student','other-student',$other);
        $g=Grade::create(['student_id'=>$student->user_id,'course_code'=>'IT101','description'=>'Computing','units'=>3,'academic_year'=>'2026-2027','semester'=>'First Semester']);
        Sanctum::actingAs($this->user('department','ccs-staff',$this->dept));
        $this->getJson('/api/grades?department_id='.$other)->assertOk()->assertJsonCount(0);
        $this->patchJson('/api/grades/'.$g->grade_id,['prelim'=>80,'midterm'=>80,'finals'=>80])->assertForbidden();
        $this->assertNull($g->fresh()->prelim);
    }
    public function test_department_cannot_manage_another_department_or_shared_subject(): void {
        $other=Department::where('code','CBAA')->value('department_id');
        Subject::create(['subject_code'=>'BUS101','name'=>'Business','units'=>3,'department_id'=>$other,'program'=>'BS Accountancy']);
        Subject::create(['subject_code'=>'GE101','name'=>'General education','units'=>3]);
        Sanctum::actingAs($this->user('department','ccs',$this->dept));
        $this->getJson('/api/subjects?department_id='.$other)->assertOk()->assertJsonMissing(['code'=>'BUS101']);
        $this->patchJson('/api/subjects/BUS101',['name'=>'Edited','units'=>3,'departmentId'=>$this->dept,'program'=>'BS Information Technology'])->assertForbidden();
        $this->deleteJson('/api/subjects/GE101')->assertForbidden();
        $this->postJson('/api/subjects',['code'=>'BAD101','name'=>'Other','units'=>3,'departmentId'=>$other,'program'=>'BS Accountancy'])->assertForbidden();
    }
    public function test_registrar_has_record_access_but_cannot_manage_grades_or_subjects(): void {
        Sanctum::actingAs($this->user('registrar','reg'));
        $this->getJson('/api/subjects')->assertForbidden();$this->getJson('/api/grades')->assertForbidden();
        $this->getJson('/api/admissions')->assertOk();
        Sanctum::actingAs($this->user('department','unassigned'));
        $this->getJson('/api/grades')->assertForbidden();
    }
    public function test_notification_delete_all_is_per_user_including_role_broadcasts(): void {
        $a=$this->user('cashier','cashier1');$b=$this->user('cashier','cashier2');
        Rules::notify('cashier','Important payment update.',page:'payments');
        Sanctum::actingAs($a);$this->deleteJson('/api/notifications')->assertOk();$this->getJson('/api/notifications')->assertOk()->assertJsonCount(0);
        Sanctum::actingAs($b);$this->getJson('/api/notifications')->assertOk()->assertJsonCount(1);
        $this->assertDatabaseCount('notifications',1);
        Rules::notify('cashier','A later payment update.',page:'payments');
        Sanctum::actingAs($a);$this->getJson('/api/notifications')->assertOk()->assertJsonCount(1);
    }
    public function test_alternate_term_labels_reuse_the_existing_term(): void {
        $receipt=$this->apply();$student=$this->accept($receipt);
        $this->assertSame(Rules::currentTerm(),Rules::normalizedTerm('First Semester, A.Y. 2026–2027'));
        AcademicEnrollment::prepare($student);Rules::ensureAssessment($student);
        $this->assertDatabaseCount('assessments',1);
    }
    public function test_session_handshake_blocks_disabled_accounts_and_private_audit_events(): void {
        $staff=$this->user('registrar','disabled');$staff->update(['status'=>'Inactive']);Sanctum::actingAs($staff);
        $this->getJson('/api/me')->assertUnauthorized();
        $student=$this->user('student','student');Rules::logActivity($student,'Updated own profile','user',$student->user_id);
        $this->assertDatabaseCount('activity_logs',0);
        $admin=$this->user('admin','admin');Rules::logActivity($admin,'Changed system settings','settings',1);
        $this->assertDatabaseCount('activity_logs',1);
    }
    public function test_registrar_email_is_explicit_private_and_does_not_regenerate_credentials(): void {
        $mailer=\Mockery::mock(\App\Support\RegistrarMailer::class);$mailer->shouldReceive('configured')->andReturn(true);$this->app->instance(\App\Support\RegistrarMailer::class,$mailer);
        $receipt=$this->apply();$student=$this->accept($receipt);
        $passwordHash=$student->password;
        $mailer->shouldReceive('send')->once()->andReturnNull();
        $url='/api/admissions/'.$receipt['application']['id'].'/email-credentials';
        $this->postJson($url)->assertOk()->assertJsonMissingPath('credentials');
        $this->postJson($url)->assertOk();
        $this->assertNotNull(AdmissionApplication::first()->credentials_emailed_at);
        $this->assertNull(AdmissionApplication::first()->credential_payload);
        $this->assertSame($passwordHash,$student->fresh()->password);
    }
    public function test_mail_failure_and_unconfigured_mail_preserve_enrollment_for_retry(): void {
        $mailer=\Mockery::mock(\App\Support\RegistrarMailer::class);$mailer->shouldReceive('configured')->andReturn(false);$this->app->instance(\App\Support\RegistrarMailer::class,$mailer);
        $receipt=$this->apply();$student=$this->accept($receipt);
        $url='/api/admissions/'.$receipt['application']['id'].'/email-credentials';
        $this->postJson($url)->assertUnprocessable();
        $mailer=\Mockery::mock(\App\Support\RegistrarMailer::class);$mailer->shouldReceive('configured')->andReturn(true);$this->app->instance(\App\Support\RegistrarMailer::class,$mailer);
        $mailer->shouldReceive('send')->once()->andThrow(new \RuntimeException('private provider details'));
        $this->postJson($url)->assertStatus(502)->assertJsonMissing(['message'=>'private provider details']);
        $this->assertNotNull(AdmissionApplication::first()->credential_payload);
        $this->assertNull(AdmissionApplication::first()->credentials_emailed_at);
        $this->assertSame('Failed',AdmissionApplication::first()->credential_email_status);
        $this->assertSame(1,AdmissionApplication::first()->credential_email_attempts);
        $this->assertDatabaseHas('enrollments',['student_id'=>$student->user_id,'status'=>'Enrolled']);
    }
    public function test_other_roles_cannot_access_or_email_credentials(): void {
        $receipt=$this->apply();$student=$this->accept($receipt);
        Sanctum::actingAs($student);
        $this->postJson('/api/admissions/'.$receipt['application']['id'].'/registrar-credentials')->assertForbidden();
        $this->postJson('/api/admissions/'.$receipt['application']['id'].'/email-credentials')->assertForbidden();
    }

    public function test_readiness_blocks_empty_curriculum_without_creating_student_records(): void {
        Subject::query()->delete();
        $receipt=$this->apply();
        $url='/api/admissions/'.$receipt['application']['id'];
        $this->getJson($url.'/readiness')->assertUnauthorized();
        Sanctum::actingAs($this->user('registrar','readiness-registrar'));
        $this->getJson($url.'/readiness')->assertOk()->assertJsonPath('ready',false)->assertJsonPath('matchingSubjects',0)->assertJsonMissingPath('credentials');
        $this->patchJson($url,['status'=>'Accepted'])->assertUnprocessable();
        $this->assertDatabaseHas('admission_applications',['id'=>$receipt['application']['id'],'status'=>'Pending','student_id'=>null]);
        $this->assertDatabaseCount('student_profiles',0);
        $this->assertDatabaseCount('enrollments',0);
        $this->assertDatabaseCount('assessments',0);
        Sanctum::actingAs($this->user('department','readiness-department',$this->dept));
        $this->getJson($url.'/readiness')->assertForbidden();
    }

}
