<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiError;
use App\Models\{AcademicProgram, User, StudentProfile, SystemSetting};
use App\Support\{Rules, AcademicAssignments, StudentProgression, AcademicEnrollment};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class AcademicProgressionController extends ApiController {
    private function administrator(Request $request): User {
        $actor=$this->need($request,'settings.manage');
        if ($actor->role->key !== 'admin') { throw new ApiError('Only administrators can activate an academic year.',403); }
        return $actor;
    }
    public function programs(Request $request) {
        $actor=$this->need($request,'subjects.manage','settings.manage');
        if (! in_array($actor->role->key,['admin','department'],true)) { throw new ApiError('Not authorized.',403); }
        return AcademicProgram::when($actor->role->key === 'department',fn ($q)=>$q->where('department_id',$actor->department_id ?: -1))->orderBy('name')->get();
    }
    public function updateProgram(Request $request, int $id) {
        $actor=$this->need($request,'subjects.manage','settings.manage');
        $program=AcademicProgram::findOrFail($id);
        if ($actor->role->key !== 'admin' && ($actor->role->key !== 'department' || ! $actor->department_id || (int)$actor->department_id !== (int)$program->department_id)) { throw new ApiError('Outside your department.',403); }
        $values=$request->validate(['duration_years'=>'required|integer|between:1,5']);
        $program->update($values);return $program->fresh();
    }
    private function target(Request $request): array {
        $v=$request->validate(['targetTerm'=>'required|string|max:60']);
        $source=Rules::termParts(Rules::currentTerm());$target=Rules::termParts($v['targetTerm']);
        if (! $source || ! $target || $target[1] !== 'First Semester' || (int)substr($target[0],0,4) !== (int)substr($source[0],0,4)+1 || (int)substr($target[0],5,4) !== (int)substr($target[0],0,4)+1) { throw new ApiError('Choose the First Semester of the next consecutive academic year.',422); }
        return [$source[0],$target[0],Rules::normalizedTerm($v['targetTerm'])];
    }
    public function preview(Request $request) {
        $this->administrator($request);[$source,$target,$term]=$this->target($request);
        return ['sourceTerm'=>Rules::currentTerm(),'targetTerm'=>$term,'students'=>User::whereHas('role',fn ($q)=>$q->where('key','student'))->orderBy('user_id')->get()->map(fn ($s)=>StudentProgression::evaluate($s,$source,$target))];
    }
    public function activate(Request $request) {
        $actor=$this->administrator($request);
        $v=$request->validate(['sourceTerm'=>'required|string','studentIds'=>'present|array','studentIds.*'=>'integer|distinct','reviewed'=>'accepted']);
        try {
            return DB::transaction(function () use ($request,$v,$actor) {
                $settings=SystemSetting::query()->lockForUpdate()->firstOrFail();Rules::forgetSettings();
                if ($settings->current_term !== $v['sourceTerm']) { throw new ApiError('Academic term changed. Preview again before confirming.',409); }
                [$source,$target,$term]=$this->target($request);$promoted=[];
                foreach ($v['studentIds'] as $id) {
                    $student=User::whereKey($id)->lockForUpdate()->firstOrFail();
                    if (! $student->isStudent()) { throw new ApiError('Invalid student selection.',422); }
                    $profile=StudentProfile::whereKey($id)->lockForUpdate()->firstOrFail();
                    $check=StudentProgression::evaluate($student,$source,$target);
                    if (! $check['eligible']) { throw new ApiError('Eligibility changed for '.$student->username.': '.$check['reason'],422); }
                    if (\App\Models\Enrollment::where('student_id',$id)->get()->contains(fn ($e)=>(Rules::termParts($e->term)[0] ?? '') === $target)) { throw new ApiError('Target-year enrollment already exists for '.$student->username.'. Review it before promotion.',422); }
                    DB::table('student_promotions')->insert(['student_id'=>$id,'academic_year'=>$target,'from_year'=>$check['fromYear'],'to_year'=>$check['toYear'],'approved_by'=>$actor->user_id,'created_at'=>now(),'updated_at'=>now()]);
                    $profile->update(['year_level'=>AcademicAssignments::label($check['toYear'])]);$promoted[]=$student->username;
                }
                $settings->update(['current_term'=>$term,'enrollment_open'=>false]);Rules::forgetSettings();
                AcademicEnrollment::syncAll();
                Rules::logActivity($actor,'Updated system settings','settings',1);
                return ['promoted'=>$promoted,'currentTerm'=>$term,'message'=>'Academic year activated. Enrollment remains closed until subject assignments and held students are reviewed.'];
            });
        } finally {
            Rules::forgetSettings();
        }
    }
}
