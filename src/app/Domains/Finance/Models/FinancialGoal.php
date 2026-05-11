<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinancialGoal extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'target_amount_encrypted', 'current_amount_encrypted',
        'category', 'deadline', 'is_completed', 'is_archived',
    ];

    protected function casts(): array
    {
        return [
            'target_amount_encrypted' => EncryptedCast::class,
            'current_amount_encrypted' => EncryptedCast::class,
            'deadline' => 'date',
            'is_completed' => 'boolean',
            'is_archived' => 'boolean',
        ];
    }

    public function getCurrentAmountAttribute(): float
    {
        $goals = $this->relationLoaded('transactionGoals')
            ? $this->transactionGoals
            : $this->transactionGoals()->get();

        return $goals->sum(fn($tg) => (float) $tg->amount_encrypted);
    }

    public function getProgressPercentAttribute(): float
    {
        $target = (float) $this->target_amount_encrypted;

        return (float) min(100, $target > 0 ? round($this->current_amount / $target * 100, 1) : 0);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactionGoals()
    {
        return $this->hasMany(TransactionGoal::class);
    }

    public function wishlistItems()
    {
        return $this->hasMany(WishlistItem::class);
    }
}
