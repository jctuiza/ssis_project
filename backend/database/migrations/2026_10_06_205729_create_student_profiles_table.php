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
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->primary();
            $table->string('program', 150);
            $table->enum('year_level', ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']);
            $table->date('birthdate')->nullable();
            $table->string('address')->nullable();
            $table->string('emergency_name', 150)->nullable();
            $table->string('emergency_contact', 30)->nullable();
            $table->string('signature', 150)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
    }
};
