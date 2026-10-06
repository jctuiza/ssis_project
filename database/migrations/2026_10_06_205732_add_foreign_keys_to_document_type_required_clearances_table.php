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
        Schema::table('document_type_required_clearances', function (Blueprint $table) {
            $table->foreign(['document_type_id'], 'dtrc_document_type_fk')->references(['document_type_id'])->on('document_types')->onUpdate('restrict')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_type_required_clearances', function (Blueprint $table) {
            $table->dropForeign('dtrc_document_type_fk');
        });
    }
};
