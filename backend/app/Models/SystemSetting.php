<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $table = 'system_settings';

    protected $primaryKey = 'setting_id';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'enrollment_open' => 'boolean',
            'document_requests_open' => 'boolean',
            'email_notifications' => 'boolean',
            'maintenance_mode' => 'boolean',
        ];
    }
}
