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
        Schema::create('clearances', function (Blueprint $table) {
            $table->bigIncrements('clearance_id');
            $table->unsignedBigInteger('student_id');
            $table->enum('office', ['Registrar', 'Cashier', 'Department']);
            $table->enum('status', ['Cleared', 'Pending', 'On Hold'])->default('Pending');
            $table->string('remarks', 500)->nullable();
            $table->unsignedBigInteger('updated_by')->nullable()->index();
            $table->timestamps();

            $table->unique(['student_id', 'office'], 'clearances_student_office_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clearances');
    }
};
