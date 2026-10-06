<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnrollmentSubject extends Model
{
    protected $table = 'enrollment_subjects';

    protected $primaryKey = 'enrollment_subject_id';

    public $timestamps = false;
    protected $guarded = [];
}
