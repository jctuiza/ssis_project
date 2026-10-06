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
        Schema::table('users', function (Blueprint $table) {
            $table->foreign(['department_id'], 'users_department_fk')->references(['department_id'])->on('departments')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['role_id'], 'users_role_fk')->references(['role_id'])->on('roles')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign('users_department_fk');
            $table->dropForeign('users_role_fk');
        });
    }
};
