<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Creates the one and only Admin account. Everything else (staff, students, subjects, grades...) is
     * entered through the system itself, so there is no demo data. Roles, permissions, departments, document types
     * and settings come from database/ssis_db.sql.
     *
     * Set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env; without a password a random one is generated and printed once.
     */
    public function run(): void
    {
        $adminRole = Role::where('key', 'admin')->first();
        if (! $adminRole) {
            $this->command?->error('Roles are missing. Import database/ssis_db.sql first (or run: php artisan ssis:install).');

            return;
        }
        if (User::where('role_id', $adminRole->role_id)->exists()) {
            $this->command?->info('An Admin account already exists. Nothing to do.');

            return;
        }

        $username = strtolower(env('ADMIN_USERNAME', 'admin'));
        $password = env('ADMIN_PASSWORD') ?: Str::password(12, symbols: false);

        User::create([
            'username' => $username, 'email' => env('ADMIN_EMAIL', 'admin@ssis.local'), 'password' => $password, 'name' => 'System Administrator',
            'role_id' => $adminRole->role_id, 'department_id' => null, 'contact' => null, 'status' => 'Active', 'must_change_password' => true,
        ]);

        $this->command?->info("Admin account created. Username: {$username}");
        if (! env('ADMIN_PASSWORD')) {
            $this->command?->warn("Temporary password (shown once): {$password}");
        }
        $this->command?->line('You will be asked to change the password at the first login.');
    }
}
