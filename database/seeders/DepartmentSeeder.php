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
        DB::table('departments')->insert([
            [
                'code' => 'CCS',
                'name' => 'College of Computing Studies',
                'head_name' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'CBA',
                'name' => 'College of Business and Accountancy',
                'head_name' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'CAS',
                'name' => 'College of Arts and Sciences',
                'head_name' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'COE',
                'name' => 'College of Engineering',
                'head_name' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}