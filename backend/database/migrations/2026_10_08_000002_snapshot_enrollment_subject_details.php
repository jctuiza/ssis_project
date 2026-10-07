<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollment_subjects', function (Blueprint $table) {
            $table->string('subject_name', 150)->nullable();
            $table->unsignedTinyInteger('units')->nullable();
            $table->string('schedule', 60)->nullable();
        });
        // Old rows have no historical copy; initialize from the catalog available at migration time.
        DB::table('enrollment_subjects')->orderBy('enrollment_subject_id')->chunkById(200, function ($rows) {
            $subjects = DB::table('subjects')->whereIn('subject_code', $rows->pluck('subject_code'))->get()->keyBy('subject_code');
            foreach ($rows as $row) {
                if ($subject = $subjects->get($row->subject_code)) {
                    DB::table('enrollment_subjects')->where('enrollment_subject_id', $row->enrollment_subject_id)->update([
                        'subject_name' => $subject->name, 'units' => $subject->units, 'schedule' => $subject->schedule,
                    ]);
                }
            }
        }, 'enrollment_subject_id');
    }

    public function down(): void
    {
        Schema::table('enrollment_subjects', fn (Blueprint $table) => $table->dropColumn(['subject_name', 'units', 'schedule']));
    }
};
