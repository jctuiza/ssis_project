<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'users';

    protected $primaryKey = 'user_id';

    protected $guarded = [];

    protected $hidden = ['password', 'profile_photo'];


    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'must_change_password' => 'boolean',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    public function profile()
    {
        return $this->hasOne(StudentProfile::class, 'user_id', 'user_id');
    }

    /**
     * Permission keys granted by this user's role (for example grades.manage). Checked on every request, so they are kept
     * in the cache (10 minutes) between requests. After changing roles or permissions in the
     * database, run: php artisan cache:clear
     */
    public function permissionKeys(): array
    {
        return Cache::remember(
            "ssis:role-permissions:{$this->role_id}",
            600,
            fn () => Permission::query()
                ->join('role_permissions', 'role_permissions.permission_id', '=', 'permissions.permission_id')
                ->where('role_permissions.role_id', $this->role_id)
                ->pluck('permissions.key')->all(),
        );
    }

    public function isStudent(): bool
    {
        return $this->role->key === 'student';
    }
}
