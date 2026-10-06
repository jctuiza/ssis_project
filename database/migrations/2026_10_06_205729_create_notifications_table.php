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
        Schema::create('notifications', function (Blueprint $table) {
            $table->bigIncrements('notification_id');
            $table->unsignedBigInteger('recipient_role_id')->nullable();
            $table->unsignedBigInteger('recipient_id')->nullable()->index();
            $table->unsignedBigInteger('department_id')->nullable()->index();
            $table->string('message', 500);
            $table->string('page', 50)->nullable();
            $table->timestamps();

            $table->index(['recipient_role_id', 'recipient_id'], 'notifications_recipient_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
