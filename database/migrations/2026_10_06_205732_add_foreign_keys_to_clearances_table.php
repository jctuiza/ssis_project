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
        Schema::table('clearances', function (Blueprint $table) {
            $table->foreign(['student_id'], 'clearances_student_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['updated_by'], 'clearances_updated_by_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clearances', function (Blueprint $table) {
            $table->dropForeign('clearances_student_fk');
            $table->dropForeign('clearances_updated_by_fk');
        });
    }
};
