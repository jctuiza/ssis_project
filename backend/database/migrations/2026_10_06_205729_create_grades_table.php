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
        Schema::create('grades', function (Blueprint $table) {
            $table->bigIncrements('grade_id');
            $table->unsignedBigInteger('student_id');
            $table->string('course_code', 20);
            $table->string('description', 150);
            $table->unsignedTinyInteger('units');
            $table->string('academic_year', 9);
            $table->enum('semester', ['First Semester', 'Second Semester']);
            $table->decimal('prelim', 5)->nullable();
            $table->decimal('midterm', 5)->nullable();
            $table->decimal('finals', 5)->nullable();
            $table->unsignedBigInteger('posted_by')->nullable()->index();
            $table->timestamps();

            $table->unique(['student_id', 'course_code', 'academic_year', 'semester'], 'grades_student_course_term_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
