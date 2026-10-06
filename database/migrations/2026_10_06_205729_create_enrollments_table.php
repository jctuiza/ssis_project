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
        Schema::create('enrollments', function (Blueprint $table) {
            $table->bigIncrements('enrollment_id');
            $table->unsignedBigInteger('student_id');
            $table->string('term', 60);
            $table->enum('status', ['Pending', 'Enrolled', 'Rejected', 'Not Enrolled'])->default('Pending')->index();
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable()->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('remarks', 500)->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'term'], 'enrollments_student_term_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
