<?php

namespace App\Domains\Finance\Models;

use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;

class TransactionGoal extends Model
{
    protected $fillable = [
        'transaction_id', 'financial_goal_id', 'amount_encrypted', 'occurred_at', 'note',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
        ];
    }

    protected $table = 'transaction_goal';

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function financialGoal()
    {
        return $this->belongsTo(FinancialGoal::class);
    }
}
