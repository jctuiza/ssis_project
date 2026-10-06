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
        Schema::table('notification_reads', function (Blueprint $table) {
            $table->foreign(['notification_id'], 'notification_reads_notification_fk')->references(['notification_id'])->on('notifications')->onUpdate('restrict')->onDelete('cascade');
            $table->foreign(['user_id'], 'notification_reads_user_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notification_reads', function (Blueprint $table) {
            $table->dropForeign('notification_reads_notification_fk');
            $table->dropForeign('notification_reads_user_fk');
        });
    }
};
