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
        Schema::create('system_settings', function (Blueprint $table) {
            $table->bigIncrements('setting_id');
            $table->string('system_name', 150);
            $table->string('current_term', 60);
            $table->boolean('enrollment_open')->default(true);
            $table->boolean('document_requests_open')->default(true);
            $table->boolean('email_notifications')->default(true);
            $table->boolean('maintenance_mode')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
