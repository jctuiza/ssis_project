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
        Schema::table('grades', function (Blueprint $table) {
            $table->foreign(['posted_by'], 'grades_poster_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['student_id'], 'grades_student_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropForeign('grades_poster_fk');
            $table->dropForeign('grades_student_fk');
        });
    }
};
