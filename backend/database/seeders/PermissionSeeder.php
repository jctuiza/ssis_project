<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            [
                'key' => 'students.view',
                'label' => 'View student records',
                'group' => 'Students',
            ],
            [
                'key' => 'students.manage',
                'label' => 'Register new students and edit student information',
                'group' => 'Students',
            ],
            [
                'key' => 'enrollment.manage',
                'label' => 'Review enrollment requests',
                'group' => 'Enrollment',
            ],
            [
                'key' => 'grades.manage',
                'label' => 'Encode and correct grades',
                'group' => 'Grades',
            ],
            [
                'key' => 'clearance.registrar',
                'label' => 'Update Registrar clearance',
                'group' => 'Clearance',
            ],
            [
                'key' => 'clearance.department',
                'label' => 'Update Department clearance',
                'group' => 'Clearance',
            ],
            [
                'key' => 'documents.process',
                'label' => 'Review, approve and release document requests',
                'group' => 'Document requests',
            ],
            [
                'key' => 'documents.review',
                'label' => 'Review document requests (start review or reject)',
                'group' => 'Document requests',
            ],
            [
                'key' => 'payments.manage',
                'label' => 'Manage student accounts, record payments and document fees',
                'group' => 'Cashier',
            ],
            [
                'key' => 'transactions.view',
                'label' => 'Monitor transactions (read-only)',
                'group' => 'Administration',
            ],
            [
                'key' => 'records.view',
                'label' => 'View academic records',
                'group' => 'Records and reports',
            ],
            [
                'key' => 'reports.view',
                'label' => 'View reports',
                'group' => 'Records and reports',
            ],
            [
                'key' => 'departments.view',
                'label' => 'View departments',
                'group' => 'Administration',
            ],
            [
                'key' => 'announcements.manage',
                'label' => 'Publish announcements',
                'group' => 'Administration',
            ],
            [
                'key' => 'logs.view',
                'label' => 'View activity logs',
                'group' => 'Administration',
            ],
            [
                'key' => 'settings.manage',
                'label' => 'Change system settings',
                'group' => 'Administration',
            ],
            [
                'key' => 'users.manage',
                'label' => 'Manage user accounts and reset passwords',
                'group' => 'Administration',
            ],
            [
                'key' => 'roles.manage',
                'label' => 'Create and configure roles',
                'group' => 'Administration',
            ],
        ];

        foreach ($permissions as $permission) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $permission['key']],
                [
                    'label' => $permission['label'],
                    'group' => $permission['group'],
                ]
            );
        }
    }
}