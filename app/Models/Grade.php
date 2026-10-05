<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    protected $table = 'grades';

    protected $primaryKey = 'grade_id';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'prelim' => 'float',
            'midterm' => 'float',
            'finals' => 'float',
            'units' => 'integer',
        ];
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id', 'user_id');
    }
}
