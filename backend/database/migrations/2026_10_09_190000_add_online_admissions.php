<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void {
        Schema::create('academic_programs', function (Blueprint $t) {
            $t->id(); $t->unsignedBigInteger('department_id'); $t->string('name',150); $t->timestamps();
            $t->unique(['department_id','name']);
            $t->foreign('department_id')->references('department_id')->on('departments')->restrictOnDelete();
        });
        (new \Database\Seeders\AcademicProgramSeeder)->run();
        Schema::create('admission_applications', function (Blueprint $t) {
            $t->id(); $t->uuid('reference')->unique(); $t->string('access_hash', 64);
            $t->string('identity_hash', 64)->unique(); $t->string('email')->unique();
            $t->string('first_name', 80); $t->string('last_name', 80); $t->string('middle_name', 80)->nullable();
            $t->string('gender', 30); $t->date('birthdate'); $t->string('contact', 30);
            $t->unsignedBigInteger('department_id'); $t->string('program', 150); $t->string('term', 60);
            $t->string('status', 20)->default('Pending')->index(); $t->unsignedBigInteger('student_id')->nullable()->unique();
            $t->unsignedBigInteger('reviewed_by')->nullable(); $t->timestamp('reviewed_at')->nullable(); $t->string('decision_note', 500)->nullable();
            $t->text('credential_payload')->nullable(); $t->timestamp('credentials_expires_at')->nullable(); $t->timestamps();
        });
        Schema::table('student_profiles', function (Blueprint $t) {
            $t->timestamp('enrolled_on')->nullable(); $t->string('admission_term', 60)->nullable(); $t->string('gender', 30)->nullable();
        });
        // Backfill only from completed enrollments, never from registration/application dates.
        foreach (DB::table('enrollments')->where('status', 'Enrolled')->orderByRaw('COALESCE(reviewed_at, submitted_at, created_at)')->get() as $e) {
            DB::table('student_profiles')->where('user_id', $e->student_id)->whereNull('enrolled_on')->update(['enrolled_on' => $e->reviewed_at ?? $e->submitted_at ?? $e->created_at]);
        }
        Schema::create('notification_dismissals', function (Blueprint $t) {
            $t->unsignedBigInteger('notification_id'); $t->unsignedBigInteger('user_id'); $t->timestamp('dismissed_at');
            $t->primary(['notification_id', 'user_id']);
        });
        DB::table('permissions')->updateOrInsert(['key' => 'subjects.manage'], ['label' => 'Manage department subjects', 'group' => 'Subjects']);
        $grade = DB::table('permissions')->where('key', 'grades.manage')->value('permission_id');
        $subject = DB::table('permissions')->where('key', 'subjects.manage')->value('permission_id');
        $registrar = DB::table('roles')->where('key', 'registrar')->value('role_id');
        $department = DB::table('roles')->where('key', 'department')->value('role_id');
        if ($registrar) DB::table('role_permissions')->where('role_id', $registrar)->whereIn('permission_id', [$grade, $subject])->delete();
        if ($department) foreach ([$grade, $subject] as $id) if ($id) DB::table('role_permissions')->updateOrInsert(['role_id'=>$department,'permission_id'=>$id], []);
    }
    public function down(): void {
        Schema::dropIfExists('academic_programs');
        Schema::dropIfExists('notification_dismissals'); Schema::dropIfExists('admission_applications');
        Schema::table('student_profiles', fn (Blueprint $t) => $t->dropColumn(['enrolled_on', 'admission_term', 'gender']));
        $grade = DB::table('permissions')->where('key', 'grades.manage')->value('permission_id');
        $subject = DB::table('permissions')->where('key', 'subjects.manage')->value('permission_id');
        $dept = DB::table('roles')->where('key', 'department')->value('role_id');
        $reg = DB::table('roles')->where('key', 'registrar')->value('role_id');
        if ($dept) DB::table('role_permissions')->where('role_id', $dept)->whereIn('permission_id', [$grade,$subject])->delete();
        if ($reg && $grade) DB::table('role_permissions')->updateOrInsert(['role_id'=>$reg,'permission_id'=>$grade], []);
    }
};
