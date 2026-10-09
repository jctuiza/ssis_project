<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\{Schema, DB};
return new class extends Migration {
    public function up(): void {
        Schema::table('academic_programs', function (Blueprint $t): void {
            $t->unsignedTinyInteger('duration_years')->nullable();
            $t->string('active_curriculum', 60)->default('Current');
            $t->decimal('promotion_pass_mark', 5, 2)->nullable();
        });
        Schema::table('subjects', function (Blueprint $t): void {
            $t->unsignedTinyInteger('year_level')->nullable();
            $t->json('shared_year_levels')->nullable();
            $t->string('semester', 30)->nullable();
            $t->string('curriculum', 60)->nullable();
        });
        Schema::table('student_profiles', function (Blueprint $t): void { $t->string('curriculum',60)->default('Current'); });
        Schema::table('enrollments', function (Blueprint $t): void {
            $t->unsignedTinyInteger('year_level')->nullable();
            $t->string('program_snapshot', 150)->nullable();
            $t->string('curriculum_snapshot', 60)->nullable();
        });
        Schema::create('student_promotions', function (Blueprint $t): void {
            $t->id();$t->unsignedBigInteger('student_id');$t->string('academic_year', 9);
            $t->unsignedTinyInteger('from_year');$t->unsignedTinyInteger('to_year');
            $t->unsignedBigInteger('approved_by');$t->timestamps();
            $t->unique(['student_id','academic_year']);
            $t->foreign('student_id')->references('user_id')->on('users')->restrictOnDelete();
        });
        Schema::table('admission_applications', function (Blueprint $t): void {
            $t->string('credential_email_status', 20)->default('Not sent');
            $t->unsignedInteger('credential_email_attempts')->default(0);
            $t->timestamp('credential_email_attempted_at')->nullable();
            $t->string('credential_email_error', 200)->nullable();
        });
        // Only current-term snapshots can be derived from the present student profile.
        $term=DB::table('system_settings')->value('current_term');
        foreach (DB::table('enrollments')->where('term',$term)->get() as $e) {
            $p=DB::table('student_profiles')->where('user_id',$e->student_id)->first();
            if ($p && preg_match('/([1-5])/', $p->year_level ?? '', $m)) {
                DB::table('enrollments')->where('enrollment_id',$e->enrollment_id)->update(['year_level'=>(int)$m[1],'program_snapshot'=>$p->program,'curriculum_snapshot'=>'Current']);
            }
        }
        DB::table('admission_applications')->whereNotNull('credentials_emailed_at')->update(['credential_email_status'=>'Sent']);
    }
    public function down(): void {
        Schema::table('admission_applications',fn (Blueprint $t)=>$t->dropColumn(['credential_email_status','credential_email_attempts','credential_email_attempted_at','credential_email_error']));
        Schema::dropIfExists('student_promotions');
        Schema::table('student_profiles',fn (Blueprint $t)=>$t->dropColumn('curriculum'));
        Schema::table('enrollments',fn (Blueprint $t)=>$t->dropColumn(['year_level','program_snapshot','curriculum_snapshot']));
        Schema::table('subjects',fn (Blueprint $t)=>$t->dropColumn(['year_level','shared_year_levels','semester','curriculum']));
        Schema::table('academic_programs',fn (Blueprint $t)=>$t->dropColumn(['duration_years','active_curriculum','promotion_pass_mark']));
    }
};
