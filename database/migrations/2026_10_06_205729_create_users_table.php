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
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('user_id');
            $table->string('username', 50)->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('name', 150);
            $table->unsignedBigInteger('role_id')->index();
            $table->unsignedBigInteger('department_id')->nullable()->index();
            $table->string('contact', 30)->nullable();
            $table->enum('status', ['Active', 'Inactive'])->default('Active');
            $table->boolean('must_change_password')->default(false);
            $table->mediumText('profile_photo')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
