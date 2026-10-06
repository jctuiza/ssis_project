<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $table = 'transactions';

    protected $primaryKey = 'transaction_id';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_at' => 'datetime',
        ];
    }
}
