<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\{Department,AcademicProgram,StudentProfile,User,Subject};
class AcademicProgramSeeder extends Seeder {
    public function run(): void {
        foreach(Department::all() as $d) {
            $names=collect(config('academic_programs.'.strtoupper($d->code),[]))
                ->merge(StudentProfile::whereIn('user_id',User::where('department_id',$d->department_id)->select('user_id'))->pluck('program'))
                ->merge(Subject::where('department_id',$d->department_id)->whereNotNull('program')->pluck('program'))->filter()->unique();
            foreach($names as $name) AcademicProgram::firstOrCreate(['department_id'=>$d->department_id,'name'=>$name]);
        }
    }
}
