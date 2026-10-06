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
        Schema::table('notifications', function (Blueprint $table) {
            $table->foreign(['department_id'], 'notifications_department_fk')->references(['department_id'])->on('departments')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['recipient_id'], 'notifications_recipient_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['recipient_role_id'], 'notifications_role_fk')->references(['role_id'])->on('roles')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign('notifications_department_fk');
            $table->dropForeign('notifications_recipient_fk');
            $table->dropForeign('notifications_role_fk');
        });
    }
};
