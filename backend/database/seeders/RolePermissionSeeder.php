<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'admin' => [
                'users.manage',
                'roles.manage',
                'departments.view',
                'announcements.manage',
                'transactions.view',
                'reports.view',
                'logs.view',
                'settings.manage',
            ],

            'registrar' => [
                'students.view',
                'students.manage',
                'enrollment.manage',
                'grades.manage',
                'clearance.registrar',
                'documents.process',
                'records.view',
                'reports.view',
            ],

            'cashier' => [
                'payments.manage',
                'reports.view',
            ],

            'department' => [
                'students.view',
                'clearance.department',
                'documents.review',
                'records.view',
                'reports.view',
            ],

            'student' => [],
        ];

        foreach ($permissions as $roleKey => $permissionKeys) {
            $role = DB::table('roles')
                ->where('key', $roleKey)
                ->first();

            foreach ($permissionKeys as $permissionKey) {
                $permission = DB::table('permissions')
                    ->where('key', $permissionKey)
                    ->first();

                DB::table('role_permissions')->insert([
                    'role_id' => $role->role_id,
                    'permission_id' => $permission->permission_id,
                ]);
            }
        }
    }
}