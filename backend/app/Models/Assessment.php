<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assessment extends Model
{
    protected $table = 'assessments';

    protected $primaryKey = 'assessment_id';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'tuition' => 'float',
            'tuition_pending' => 'boolean',
            'tuition_rate' => 'float',
            'misc_fees' => 'float',
        ];
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id', 'user_id');
    }
}
