<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subjects', fn (Blueprint $table) => $table->string('program', 150)->nullable());
        Schema::table('clearances', fn (Blueprint $table) => $table->string('term', 60)->nullable());
        $term = DB::table('system_settings')->orderBy('setting_id')->value('current_term');
        DB::table('clearances')->whereNull('term')->update(['term' => $term]);
        Schema::table('clearances', function (Blueprint $table) {
            $table->index('student_id', 'clearances_student_index');
            $table->dropUnique('clearances_student_office_unique');
            $table->unique(['student_id', 'office', 'term'], 'clearances_student_office_term_unique');
        });
        DB::table('enrollments')->whereIn('status', ['Pending', 'Rejected'])->update(['status' => 'Not Enrolled']);
        Schema::table('enrollments', fn (Blueprint $table) => $table->enum('status', ['Enrolled', 'Not Enrolled'])->default('Not Enrolled')->change());
    }

    public function down(): void
    {
        // Clearance history cannot be collapsed safely into one record per office.
        throw new RuntimeException('Restore a database backup to roll back this historical-data migration.');
    }
};
