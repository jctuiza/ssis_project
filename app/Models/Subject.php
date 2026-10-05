<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $table = 'subjects';

    protected $primaryKey = 'subject_code';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
}
