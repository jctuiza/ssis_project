<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentRequest extends Model
{
    protected $table = 'document_requests';

    protected $primaryKey = 'document_request_id';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'fee_amount' => 'float',
            'prepared' => 'boolean',
        ];
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id', 'user_id');
    }

    public function type()
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id', 'document_type_id');
    }
}
