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
        Schema::create('document_requests', function (Blueprint $table) {
            $table->bigIncrements('document_request_id');
            $table->string('reference_no', 20)->unique();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('document_type_id')->index();
            $table->string('purpose');
            $table->enum('status', ['Submitted', 'Under Review', 'Approved', 'Pending Payment', 'Payment Recorded', 'Processing', 'Ready for Release', 'Completed', 'Rejected'])->default('Submitted');
            $table->string('remarks', 500)->nullable();
            $table->decimal('fee_amount', 10)->default(0);
            $table->enum('fee_status', ['Unpaid', 'Paid', 'Waived'])->default('Unpaid');
            $table->boolean('prepared')->default(false);
            $table->unsignedBigInteger('processed_by')->nullable()->index();
            $table->timestamps();

            $table->index(['student_id', 'status'], 'document_requests_student_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_requests');
    }
};
