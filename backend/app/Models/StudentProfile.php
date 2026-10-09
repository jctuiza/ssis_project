<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentProfile extends Model
{
    protected $table = 'student_profiles';

    protected $primaryKey = 'user_id';

    public $incrementing = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
            'enrolled_on' => 'datetime',
        ];
    }
}
