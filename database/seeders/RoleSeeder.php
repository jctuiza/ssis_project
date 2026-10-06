<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('roles')->insert([
            [
                'key' => 'student',
                'label' => 'Student',
                'description' => 'Views own records and requests services online.',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'admin',
                'label' => 'Admin',
                'description' => 'Manages users, roles, departments, announcements and system settings.',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'registrar',
                'label' => 'Registrar',
                'description' => 'Maintains student records, registers new students and processes academic requests.',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'cashier',
                'label' => 'Cashier',
                'description' => 'Handles assessments, installment payments, document fees and student accounts.',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'department',
                'label' => 'Department',
                'description' => 'Clears and reviews students under its department.',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}