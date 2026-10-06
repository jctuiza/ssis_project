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
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreign(['assessment_id'], 'transactions_assessment_fk')->references(['assessment_id'])->on('assessments')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['recorded_by'], 'transactions_recorder_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['document_request_id'], 'transactions_request_fk')->references(['document_request_id'])->on('document_requests')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['student_id'], 'transactions_student_fk')->references(['user_id'])->on('users')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign('transactions_assessment_fk');
            $table->dropForeign('transactions_recorder_fk');
            $table->dropForeign('transactions_request_fk');
            $table->dropForeign('transactions_student_fk');
        });
    }
};
