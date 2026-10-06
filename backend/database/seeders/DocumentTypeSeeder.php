<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('document_types')->insert([
            [
                'name' => 'Certificate of Enrollment',
                'fee' => 50.00,
                'processing_time' => '1–2 working days',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Transcript of Records',
                'fee' => 150.00,
                'processing_time' => '5–7 working days',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Certificate of Grades',
                'fee' => 50.00,
                'processing_time' => '1–2 working days',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Good Moral Certificate',
                'fee' => 50.00,
                'processing_time' => '2–3 working days',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Honorable Dismissal',
                'fee' => 100.00,
                'processing_time' => '3–5 working days',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}