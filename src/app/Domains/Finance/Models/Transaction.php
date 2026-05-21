<?php

namespace App\Domains\Finance\Models;

use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'account_id', 'type', 'amount_encrypted', 'description',
        'category', 'occurred_at', 'transfer_to_account_id', 'transfer_pair_id',
        'installment_plan_id', 'installment_number',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
            'occurred_at'      => 'date',
        ];
    }

    public function getIsTransferAttribute(): bool
    {
        return $this->type === 'transfer';
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function transferDestination()
    {
        return $this->belongsTo(Account::class, 'transfer_to_account_id');
    }

    public function transferPair()
    {
        return $this->belongsTo(Transaction::class, 'transfer_pair_id');
    }

    public function transactionGoals()
    {
        return $this->hasMany(TransactionGoal::class);
    }
}
