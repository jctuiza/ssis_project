<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->string('assignment_mode', 16)->default('automatic');
        });
        Schema::create('enrollment_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('department_id');
            $table->string('program', 150);
            $table->unsignedTinyInteger('year_level');
            $table->string('term', 60);
            $table->string('term_key', 60);
            $table->string('type', 16);
            $table->string('status', 24)->default('Pending')->index();
            $table->text('notes')->nullable();
            $table->json('subject_codes')->nullable();
            $table->text('recommendation')->nullable();
            $table->unsignedBigInteger('recommended_by')->nullable();
            $table->timestamp('recommended_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
            $table->unique(['student_id', 'term_key']);
            $table->foreign('student_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->foreign('department_id')->references('department_id')->on('departments')->restrictOnDelete();
            foreach (['recommended_by', 'reviewed_by', 'created_by'] as $column) {
                $table->foreign($column)->references('user_id')->on('users')->restrictOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_requests');
        Schema::table('enrollments', fn (Blueprint $table) => $table->dropColumn('assignment_mode'));
    }
};
