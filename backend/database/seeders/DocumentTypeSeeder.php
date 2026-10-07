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
        $documentTypes = [
            [
                'name' => 'Certificate of Enrollment',
                'fee' => 50.00,
                'processing_time' => '1–2 working days',
            ],
            [
                'name' => 'Transcript of Records',
                'fee' => 150.00,
                'processing_time' => '5–7 working days',
            ],
            [
                'name' => 'Certificate of Grades',
                'fee' => 50.00,
                'processing_time' => '1–2 working days',
            ],
            [
                'name' => 'Good Moral Certificate',
                'fee' => 50.00,
                'processing_time' => '2–3 working days',
            ],
            [
                'name' => 'Honorable Dismissal',
                'fee' => 100.00,
                'processing_time' => '3–5 working days',
            ],
        ];

        foreach ($documentTypes as $documentType) {
            DB::table('document_types')->updateOrInsert(
                ['name' => $documentType['name']],
                [
                    'fee' => $documentType['fee'],
                    'processing_time' => $documentType['processing_time'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}