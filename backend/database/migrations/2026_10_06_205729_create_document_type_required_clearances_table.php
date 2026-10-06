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
        Schema::create('document_type_required_clearances', function (Blueprint $table) {
            $table->unsignedBigInteger('document_type_id');
            $table->enum('office', ['Registrar', 'Cashier', 'Department']);

            $table->primary(['document_type_id', 'office']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_type_required_clearances');
    }
};
