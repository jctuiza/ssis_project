<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tuition per unit and miscellaneous fees are set by the Admin in Settings instead of being fixed in the code.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('system_settings', 'tuition_per_unit')) {
                $table->decimal('tuition_per_unit', 10, 2)->default(1500);
            }
            if (! Schema::hasColumn('system_settings', 'misc_fees')) {
                $table->decimal('misc_fees', 10, 2)->default(6500);
            }
        });
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            foreach (['tuition_per_unit', 'misc_fees'] as $column) {
                if (Schema::hasColumn('system_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
