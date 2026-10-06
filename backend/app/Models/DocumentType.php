<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    protected $table = 'document_types';

    protected $primaryKey = 'document_type_id';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'fee' => 'float',
        ];
    }

    /** Offices that must have cleared the student before this document can be requested. */
    public function requiredOffices(): array
    {
        return \Illuminate\Support\Facades\DB::table('document_type_required_clearances')
            ->where('document_type_id', $this->document_type_id)->pluck('office')->all();
    }
}
