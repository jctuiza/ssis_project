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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->bigIncrements('activity_log_id');
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('action');
            $table->string('entity_type', 50)->nullable();
            $table->string('entity_id', 64)->nullable();
            $table->timestamps();

            $table->index(['actor_id', 'created_at'], 'activity_logs_actor_created_index');
            $table->index(['entity_type', 'entity_id'], 'activity_logs_entity_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
