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
        Schema::create('transactions', function (Blueprint $table) {
            $table->bigIncrements('transaction_id');
            $table->string('reference_no', 20)->unique();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('assessment_id')->nullable()->index();
            $table->unsignedBigInteger('document_request_id')->nullable()->index();
            $table->enum('type', ['tuition', 'document_fee']);
            $table->string('description');
            $table->decimal('amount', 10);
            $table->string('method', 30)->nullable();
            $table->enum('status', ['Paid', 'Pending', 'Cancelled'])->default('Pending');
            $table->timestamp('paid_at')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable()->index();
            $table->timestamps();

            $table->index(['student_id', 'status'], 'transactions_student_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
