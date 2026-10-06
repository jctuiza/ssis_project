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
        Schema::create('assessments', function (Blueprint $table) {
            $table->bigIncrements('assessment_id');
            $table->unsignedBigInteger('student_id');
            $table->string('term', 60);
            $table->decimal('tuition', 10)->default(0);
            $table->decimal('misc_fees', 10)->default(0);
            $table->timestamps();

            $table->unique(['student_id', 'term'], 'assessments_student_term_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
