<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'type', 'balance_encrypted', 'currency',
    ];

    protected function casts(): array
    {
        return [
            'balance_encrypted' => EncryptedCast::class,
        ];
    }

    public function getCurrentBalanceAttribute(): float
    {
        $base = (float) ($this->balance_encrypted ?? 0);
        $incomeSum = $this->transactions->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
        $expenseSum = $this->transactions->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);

        return $base + $incomeSum - $expenseSum;
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
