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
        $roles = [
            [
                'key' => 'student',
                'label' => 'Student',
                'description' => 'Views own records and requests services online.',
                'is_system' => true,
            ],
            [
                'key' => 'admin',
                'label' => 'Admin',
                'description' => 'Manages users, roles, departments, announcements and system settings.',
                'is_system' => true,
            ],
            [
                'key' => 'registrar',
                'label' => 'Registrar',
                'description' => 'Maintains student records, registers new students and processes academic requests.',
                'is_system' => true,
            ],
            [
                'key' => 'cashier',
                'label' => 'Cashier',
                'description' => 'Handles assessments, installment payments, document fees and student accounts.',
                'is_system' => true,
            ],
            [
                'key' => 'department',
                'label' => 'Department',
                'description' => 'Clears and reviews students under its department.',
                'is_system' => true,
            ],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['key' => $role['key']],
                [
                    'label' => $role['label'],
                    'description' => $role['description'],
                    'is_system' => $role['is_system'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}