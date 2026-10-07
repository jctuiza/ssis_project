<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';

    protected $primaryKey = 'role_id';

    protected $guarded = [];

    protected static function booted(): void
    {
        $invalidate = function (self $model): void {
            \Illuminate\Support\Facades\Cache::forget('ssis:public-roles');
            \Illuminate\Support\Facades\Cache::forget("ssis:role-permissions:{$model->role_id}");
        };
        static::saved($invalidate);
        static::deleted($invalidate);
    }

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'role_permissions', 'role_id', 'permission_id');
    }
}
