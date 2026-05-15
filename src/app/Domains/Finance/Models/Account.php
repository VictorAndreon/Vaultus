<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Database\Factories\AccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory(): AccountFactory
    {
        return AccountFactory::new();
    }

    protected $fillable = [
        'user_id', 'name', 'type', 'balance_encrypted', 'currency',
        'credit_limit_encrypted', 'interest_rate',
    ];

    public const LIABILITY_TYPES = ['credit', 'loan'];

    protected function casts(): array
    {
        return [
            'balance_encrypted'      => EncryptedCast::class,
            'credit_limit_encrypted' => EncryptedCast::class,
            'interest_rate'          => 'float',
        ];
    }

    public function getIsLiabilityAttribute(): bool
    {
        return in_array($this->type, self::LIABILITY_TYPES);
    }

    public function getCurrentBalanceAttribute(): float
    {
        $transactions = $this->relationLoaded('transactions')
            ? $this->transactions
            : $this->transactions()->get();

        $income  = $transactions->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
        $expense = $transactions->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);

        return (float) ($this->balance_encrypted ?? 0) + $income - $expense;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
