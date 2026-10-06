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
        Schema::table('role_permissions', function (Blueprint $table) {
            $table->foreign(['permission_id'], 'role_permissions_permission_fk')->references(['permission_id'])->on('permissions')->onUpdate('restrict')->onDelete('cascade');
            $table->foreign(['role_id'], 'role_permissions_role_fk')->references(['role_id'])->on('roles')->onUpdate('restrict')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('role_permissions', function (Blueprint $table) {
            $table->dropForeign('role_permissions_permission_fk');
            $table->dropForeign('role_permissions_role_fk');
        });
    }
};
