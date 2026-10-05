<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Clearance extends Model
{
    protected $table = 'clearances';

    protected $primaryKey = 'clearance_id';

    protected $guarded = [];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id', 'user_id');
    }
}
