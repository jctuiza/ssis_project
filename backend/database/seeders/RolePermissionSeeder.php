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
                'grades.manage',
                'subjects.manage',
                'students.view',
                'clearance.department',
                'documents.review',
                'records.view',
                'reports.view',
            ],

            'student' => [],
        ];

        $reg = DB::table('roles')->where('key','registrar')->value('role_id');
        if ($reg) DB::table('role_permissions')->where('role_id',$reg)->whereIn('permission_id', DB::table('permissions')->whereIn('key',['grades.manage','subjects.manage'])->pluck('permission_id'))->delete();
        foreach ($permissions as $roleKey => $permissionKeys) {
            $role = DB::table('roles')
                ->where('key', $roleKey)
                ->first();

            if (! $role) {
                continue;
            }

            foreach ($permissionKeys as $permissionKey) {
                $permission = DB::table('permissions')
                    ->where('key', $permissionKey)
                    ->first();

                if (! $permission) {
                    continue;
                }

                DB::table('role_permissions')->updateOrInsert(
                    [
                        'role_id' => $role->role_id,
                        'permission_id' => $permission->permission_id,
                    ],
                    []
                );
            }
        }
    }
}