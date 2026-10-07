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
        $setting = DB::table('system_settings')
            ->orderBy('setting_id')
            ->first();

        $data = [
            'system_name' => 'Student Services Information System',
            'current_term' => '1st Semester, A.Y. 2026–2027',
            'enrollment_open' => true,
            'document_requests_open' => true,
            'email_notifications' => true,
            'maintenance_mode' => false,
            'updated_at' => now(),
        ];

        if ($setting) {
            DB::table('system_settings')
                ->where('setting_id', $setting->setting_id)
                ->update($data);
        } else {
            DB::table('system_settings')
                ->insert([
                    ...$data,
                    'created_at' => now(),
                ]);
        }
    }
}