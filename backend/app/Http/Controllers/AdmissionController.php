<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiError;
use App\Models\{AdmissionApplication, Department, Enrollment, EnrollmentSubject, Clearance, StudentProfile, User, Role, SystemSetting};
use App\Support\{Rules, Resources};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Crypt};
use Illuminate\Support\Str;
class AdmissionController extends ApiController {
    public function options() {
        return ['open' => (bool) Rules::settings()->enrollment_open && ! Rules::settings()->maintenance_mode,
            'term'=>Rules::currentTerm(), 'departments'=>Department::orderBy('code')->get()->map(fn ($d)=>[
                'id'=>$d->department_id, 'code'=>$d->code, 'name'=>$d->name,
                'programs'=>\App\Models\AcademicProgram::where('department_id',$d->department_id)->orderBy('name')->pluck('name'),
            ])];
    }
    private function resource(AdmissionApplication $a): array {
        return ['id'=>$a->id,'reference'=>$a->reference,'name'=>trim($a->first_name.' '.($a->middle_name ? $a->middle_name.' ' : '').$a->last_name),
            'email'=>$a->email,'contact'=>$a->contact,'birthdate'=>$a->birthdate->format('Y-m-d'),'gender'=>$a->gender,
            'departmentId'=>$a->department_id,'department'=>Resources::deptCode($a->department_id),'program'=>$a->program,
            'term'=>$a->term,'status'=>$a->status,'appliedOn'=>$a->created_at->toIso8601String(),'reviewedOn'=>$a->reviewed_at?->toIso8601String(),
            'decisionNote'=>$a->decision_note,'credentialsAvailable'=>(bool)($a->credential_payload && $a->credentials_expires_at?->isFuture()),'credentialsEmailedOn'=>$a->credentials_emailed_at?->toIso8601String(),'emailStatus'=>$a->credential_email_status,'emailAttempts'=>$a->credential_email_attempts,'emailError'=>$a->credential_email_error];
    }
    public function store(Request $r) {
        if (! Rules::settings()->enrollment_open || Rules::settings()->maintenance_mode) throw new ApiError('Online enrollment applications are currently closed.', 422);
        $input = $r->only(['firstName','lastName','middleName','gender','birthdate','contact','email','departmentId','program']);
        foreach ($input as $k=>$v) if (is_string($v)) $input[$k]=trim($v);
        $input['email']=strtolower($input['email'] ?? '');
        $v=validator($input,[
            'firstName'=>'required|string|max:80','lastName'=>'required|string|max:80','middleName'=>'nullable|string|max:80',
            'gender'=>'required|in:Male,Female,Other,Prefer not to say','birthdate'=>'required|date|before:today',
            'contact'=>['required','regex:/^\+?[0-9]{10,15}$/'],'email'=>'required|email|max:255|unique:users,email|unique:admission_applications,email',
            'departmentId'=>'required|integer|exists:departments,department_id','program'=>'required|string|max:150',
        ])->validate();
        $dept=Department::findOrFail($v['departmentId']);
        $known=\App\Models\AcademicProgram::where('department_id',$dept->department_id)->pluck('name');
        if (! $known->contains($v['program'])) throw new ApiError('Select a program offered by this department.',422,['program'=>'Select a valid program.']);
        $identity=hash('sha256',mb_strtolower(preg_replace('/\s+/u',' ', $v['firstName'].'|'.$v['lastName'].'|'.$v['birthdate'])));
        $duplicate=User::whereHas('profile',fn($q)=>$q->whereDate('birthdate',$v['birthdate']))->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($v['firstName'].' '.(!empty($v['middleName']) ? $v['middleName'].' ' : '').$v['lastName']))])->exists();
        if ($duplicate || AdmissionApplication::where('identity_hash',$identity)->exists()) throw new ApiError('An application or student record already exists for this applicant.',422);
        $key=Str::random(64);
        try {
            $a=AdmissionApplication::create(['reference'=>(string)Str::uuid(),'access_hash'=>hash('sha256',$key),'identity_hash'=>$identity,
                'first_name'=>$v['firstName'],'last_name'=>$v['lastName'],'middle_name'=>$v['middleName'] ?? null,'gender'=>$v['gender'],
                'birthdate'=>$v['birthdate'],'email'=>$v['email'],'contact'=>$v['contact'],'department_id'=>$v['departmentId'],'program'=>$v['program'],'term'=>Rules::currentTerm()]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) { throw new ApiError('An application already exists for this applicant.',422); }
        Rules::notify('registrar','A new first-year enrollment application is awaiting review.',page:'enrollment');
        return response()->json(['application'=>['reference'=>$a->reference,'status'=>$a->status]],201)->header('Cache-Control','no-store');
    }
    public function index(Request $r) {
        $actor=$this->need($r,'enrollment.manage');
        if ($actor->role->key !== 'registrar') throw new ApiError('Only the Registrar can review applications.',403);
        return AdmissionApplication::orderByDesc('id')->get()->map(fn($a)=>$this->resource($a));
    }
    private function requirements(AdmissionApplication $application): array
    {
        $policy=\App\Support\AcademicAssignments::program($application->department_id,$application->program);
        $semester=Rules::termParts($application->term)[1] ?? null;
        $subjects=Rules::offeredSubjects($application->department_id,$application->program,1,$application->term);
        $catalog=\App\Models\Subject::where('department_id',$application->department_id)->where('program',$application->program);
        $unassigned=(clone $catalog)->where(fn ($q)=>$q->whereNull('year_level')->orWhereNull('semester'))->count();
        $reason=null;
        if (! $semester) { $reason='The application academic term is invalid.'; }
        elseif (! $policy) { $reason='The application program is missing from this department catalog.'; }
        elseif ($subjects->isEmpty()) {
            $reason='No matching subjects for '.$application->program.' — First Year, '.$semester.', A.Y. '.(Rules::termParts($application->term)[0] ?? '').'. Department staff must assign subjects to these values before confirmation.';
            if ($unassigned) { $reason.=' '.$unassigned.' existing subject(s) still need year or semester assignments.'; }
        }
        return ['ready'=>$reason === null,'reason'=>$reason,'program'=>$application->program,'department'=>Resources::deptCode($application->department_id),'yearLevel'=>'First Year','semester'=>$semester,'academicYear'=>Rules::termParts($application->term)[0] ?? null,'term'=>$application->term,'matchingSubjects'=>$subjects->count(),'unassignedSubjects'=>$unassigned];
    }

    public function readiness(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        $actor=$this->need($request,'enrollment.manage');
        if ($actor->role->key !== 'registrar') { throw new ApiError('Only the Registrar can review applications.',403); }
        $application=AdmissionApplication::findOrFail($id);
        return response()->json($this->requirements($application))->header('Cache-Control','no-store');
    }

    public function decide(Request $r,int $id) {
        $actor=$this->need($r,'enrollment.manage');
        if ($actor->role->key !== 'registrar') throw new ApiError('Only the Registrar can review applications.',403);
        $v=$r->validate(['status'=>'required|in:Accepted,Declined','note'=>'nullable|string|max:500']);
        return DB::transaction(function() use($id,$v,$actor) {
            // Global admission lock also protects student-number generation across approvals/manual registration.
            SystemSetting::query()->lockForUpdate()->firstOrFail();
            $a=AdmissionApplication::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($a->status !== 'Pending') throw new ApiError('This application has already been reviewed.',409);
            $loginCredentials=null;
            if ($v['status']==='Accepted') {
                if (!Rules::settings()->enrollment_open || Rules::settings()->maintenance_mode) throw new ApiError('Enrollment is currently closed.',422);
                if (User::whereRaw('LOWER(email) = ?',[$a->email])->exists()) throw new ApiError('This email already belongs to an account.',422);
                $name=trim($a->first_name.' '.($a->middle_name ? $a->middle_name.' ' : '').$a->last_name);
                if (User::whereHas('profile',fn ($q)=>$q->whereDate('birthdate',$a->birthdate))->whereRaw('LOWER(name) = ?',[mb_strtolower($name)])->exists()) throw new ApiError('A student record already exists for this applicant.',422);
                $subjects=Rules::offeredSubjects($a->department_id,$a->program,1,$a->term);
                if ($subjects->isEmpty()) { throw new ApiError($this->requirements($a)['reason'] ?? 'No matching assigned subjects.',422); }
                $password=Str::random(20).'7a';
                $name=trim($a->first_name.' '.($a->middle_name ? $a->middle_name.' ' : '').$a->last_name);
                $student=User::create(['username'=>Rules::nextStudentNumber(),'email'=>$a->email,'password'=>$password,'name'=>$name,
                    'role_id'=>Role::where('key','student')->value('role_id'),'department_id'=>$a->department_id,'contact'=>$a->contact,'status'=>'Active','must_change_password'=>true]);
                StudentProfile::create(['user_id'=>$student->user_id,'program'=>$a->program,'year_level'=>'1st Year','birthdate'=>$a->birthdate,
                    'gender'=>$a->gender,'signature'=>$name,'admission_term'=>$a->term,'enrolled_on'=>now()]);
                $e=Enrollment::create(['student_id'=>$student->user_id,'term'=>$a->term,'status'=>'Enrolled','year_level'=>1,'program_snapshot'=>$a->program,'submitted_at'=>now(),'reviewed_at'=>now(),'reviewed_by'=>$actor->user_id,'remarks'=>'Accepted first-year online application.']);
                foreach ($subjects as $s) EnrollmentSubject::create(['enrollment_id'=>$e->enrollment_id,'subject_code'=>$s->subject_code,'subject_name'=>$s->name,'units'=>$s->units,'schedule'=>$s->schedule]);
                foreach (Rules::OFFICES as $office) Clearance::create(['student_id'=>$student->user_id,'term'=>$a->term,'office'=>$office,'status'=>'Cleared','updated_by'=>$actor->user_id,'remarks'=>'First-year admission-term exemption.']);
                Rules::ensureAssessment($student,$a->term); Rules::createGradeRows($student,$e);
                $loginCredentials=['studentNumber'=>$student->username,'username'=>$student->username,'temporaryPassword'=>$password];
                $a->student_id=$student->user_id;
                $a->credential_payload=Crypt::encryptString(json_encode(['studentNumber'=>$student->username,'temporaryPassword'=>$password],JSON_THROW_ON_ERROR));
                $a->credentials_expires_at=now()->addDays(7);
                Rules::notify('student','Your first-year enrollment application was accepted. Welcome to SSIS.',$student->user_id,page:'enrollment');
                Rules::notify('department','A first-year student has enrolled in your department.',departmentId:$a->department_id,page:'students');
            }
            $a->status=$v['status'];$a->decision_note=$v['note'] ?? null;$a->reviewed_by=$actor->user_id;$a->reviewed_at=now();$a->save();
            Rules::logActivity($actor,'Enrollment application '.$v['status'],'admission',$a->id);
            $result=$this->resource($a);
            if ($loginCredentials) {
                $result['credentials']=$loginCredentials;
                $result['email']=$a->email;
                $result['emailConfigured']=$this->emailConfigured();
            }
            return response()->json($result)->header('Cache-Control','no-store');
        });
    }
    private function emailConfigured(): bool
    {
        return app(\App\Support\RegistrarMailer::class)->configured();
    }

    private function pendingCredentials(AdmissionApplication $application): array
    {
        if ($application->status !== 'Accepted' || ! $application->credential_payload || ! $application->credentials_expires_at?->isFuture()) {
            throw new ApiError('Temporary credentials are unavailable or expired. Use the existing staff password reset process.', 422);
        }
        $student = User::findOrFail($application->student_id);
        if (! $student->must_change_password || $student->status !== 'Active') {
            $application->update(['credential_payload' => null]);
            throw new ApiError('Temporary credentials are no longer valid.', 422);
        }
        $credentials = json_decode(Crypt::decryptString($application->credential_payload), true, flags: JSON_THROW_ON_ERROR);
        if (! \Illuminate\Support\Facades\Hash::check($credentials['temporaryPassword'], $student->password)) {
            $application->update(['credential_payload' => null]);
            throw new ApiError('Temporary credentials are no longer valid.', 422);
        }
        $credentials['username'] = $credentials['studentNumber'];
        return $credentials;
    }

    public function registrarCredentials(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        $actor = $this->need($request, 'enrollment.manage');
        if ($actor->role->key !== 'registrar') {
            throw new ApiError('Only the Registrar can access enrollment credentials.', 403);
        }
        $application = AdmissionApplication::findOrFail($id);
        return response()->json([
            'id' => $application->id,
            'email' => $application->email,
            'credentials' => $this->pendingCredentials($application),
            'emailConfigured' => $this->emailConfigured(),
        ])->header('Cache-Control', 'no-store');
    }

    public function emailCredentials(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        $actor = $this->need($request, 'enrollment.manage');
        if ($actor->role->key !== 'registrar') {
            throw new ApiError('Only the Registrar can email enrollment credentials.', 403);
        }
        if (! $this->emailConfigured()) {
            throw new ApiError('Email delivery is not configured. Copy the credentials and provide them securely, or configure a delivery mailer and return to this application.', 422);
        }
        $result=DB::transaction(function () use ($id) {
            $application = AdmissionApplication::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($application->credentials_emailed_at) {
                return ['ok'=>true,'message'=>'Credentials were already sent.'];
            }
            $credentials = $this->pendingCredentials($application);
            $application->credential_email_attempts++;
            $application->credential_email_attempted_at=now();
            try {
                app(\App\Support\RegistrarMailer::class)->send($application->email,$credentials);
            } catch (\Throwable $exception) {
                $application->credential_email_status='Failed';
                $application->credential_email_error='SMTP delivery failed. Check backend configuration and retry.';
                $application->save();
                return ['ok'=>false,'message'=>'Email delivery failed. Enrollment remains confirmed. Retry from this application.'];
            }
            $application->credential_email_status='Sent';$application->credential_email_error=null;
            $application->credentials_emailed_at=now();$application->credential_payload=null;$application->save();
            return ['ok'=>true,'message'=>'Credentials accepted by the SMTP server.'];
        });
        return response()->json(['message'=>$result['message']],$result['ok'] ? 200 : 502)->header('Cache-Control','no-store');
    }

}
