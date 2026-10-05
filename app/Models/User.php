<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'users';

    protected $primaryKey = 'user_id';

    protected $guarded = [];

    protected $hidden = ['password', 'profile_photo'];

    /** @var array<int, array<int, string>> permission keys per role id, cached for the request */
    private static array $permissionCache = [];

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

    /** Permission keys granted by this user's role (for example grades.manage). */
    public function permissionKeys(): array
    {
        return self::$permissionCache[$this->role_id] ??= Permission::query()
            ->join('role_permissions', 'role_permissions.permission_id', '=', 'permissions.permission_id')
            ->where('role_permissions.role_id', $this->role_id)
            ->pluck('permissions.key')->all();
    }

    public function isStudent(): bool
    {
        return $this->role->key === 'student';
    }
}
