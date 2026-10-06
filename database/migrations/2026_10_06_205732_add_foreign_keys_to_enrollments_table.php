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
        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreign(['reviewed_by'], 'enrollments_reviewer_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['student_id'], 'enrollments_student_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign('enrollments_reviewer_fk');
            $table->dropForeign('enrollments_student_fk');
        });
    }
};
