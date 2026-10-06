<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('enrollment_subjects', function (Blueprint $table) {
            $table->foreign(['enrollment_id'], 'enrollment_subjects_enrollment_fk')->references(['enrollment_id'])->on('enrollments')->onUpdate('restrict')->onDelete('cascade');
            $table->foreign(['subject_code'], 'enrollment_subjects_subject_fk')->references(['subject_code'])->on('subjects')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollment_subjects', function (Blueprint $table) {
            $table->dropForeign('enrollment_subjects_enrollment_fk');
            $table->dropForeign('enrollment_subjects_subject_fk');
        });
    }
};
