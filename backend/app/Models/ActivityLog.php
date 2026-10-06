<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $primaryKey = 'activity_log_id';

    protected $guarded = [];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id', 'user_id');
    }
}
