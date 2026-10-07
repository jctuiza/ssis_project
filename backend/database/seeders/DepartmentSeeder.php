<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            [
                'code' => 'CCS',
                'name' => 'College of Computing Studies',
                'head_name' => null,
            ],
            [
                'code' => 'CBA',
                'name' => 'College of Business and Accountancy',
                'head_name' => null,
            ],
            [
                'code' => 'CAS',
                'name' => 'College of Arts and Sciences',
                'head_name' => null,
            ],
            [
                'code' => 'COE',
                'name' => 'College of Engineering',
                'head_name' => null,
            ],
        ];

        foreach ($departments as $department) {
            DB::table('departments')->updateOrInsert(
                ['code' => $department['code']],
                [
                    'name' => $department['name'],
                    'head_name' => $department['head_name'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}