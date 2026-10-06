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
        Schema::create('enrollment_subjects', function (Blueprint $table) {
            $table->bigIncrements('enrollment_subject_id');
            $table->unsignedBigInteger('enrollment_id');
            $table->string('subject_code', 20)->index();

            $table->unique(['enrollment_id', 'subject_code'], 'enrollment_subjects_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollment_subjects');
    }
};
