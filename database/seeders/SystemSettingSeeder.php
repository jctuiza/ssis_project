<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('system_settings')->insert([
            [
                'system_name' => 'Student Services Information System',
                'current_term' => '1st Semester, A.Y. 2026–2027',
                'enrollment_open' => true,
                'document_requests_open' => true,
                'email_notifications' => true,
                'maintenance_mode' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}