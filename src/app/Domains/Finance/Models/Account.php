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

        $income  = $transactions->whereIn('type', ['income'])->sum(fn($t) => (float) $t->amount_encrypted);
        $expense = $transactions->whereIn('type', ['expense'])->sum(fn($t) => (float) $t->amount_encrypted);

        // Para transferências: a conta é ORIGEM quando transfer_to_account_id IS NOT NULL (saída)
        // A conta é DESTINO quando transfer_to_account_id IS NULL mas transfer_pair_id existe (entrada)
        $transferOut = $transactions->where('type', 'transfer')
            ->filter(fn($t) => !is_null($t->transfer_to_account_id))
            ->sum(fn($t) => (float) $t->amount_encrypted);

        $transferIn = $transactions->where('type', 'transfer')
            ->filter(fn($t) => is_null($t->transfer_to_account_id))
            ->sum(fn($t) => (float) $t->amount_encrypted);

        return (float) ($this->balance_encrypted ?? 0) + $income - $expense + $transferIn - $transferOut;
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
