<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentTypeRequiredClearanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clearances = [
            'Good Moral Certificate' => [
                'Cashier',
                'Department',
            ],
            'Honorable Dismissal' => [
                'Registrar',
                'Cashier',
                'Department',
            ],
        ];

        foreach ($clearances as $documentName => $offices) {
            $documentType = DB::table('document_types')
                ->where('name', $documentName)
                ->first();

            if (! $documentType) {
                continue;
            }

            foreach ($offices as $office) {
                DB::table('document_type_required_clearances')->updateOrInsert(
                    [
                        'document_type_id' => $documentType->document_type_id,
                        'office' => $office,
                    ],
                    []
                );
            }
        }
    }
}