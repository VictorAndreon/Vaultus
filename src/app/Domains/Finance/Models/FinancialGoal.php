<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class FinancialGoal extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (FinancialGoal $goal) {
            if ($goal->getRawOriginal('current_amount_encrypted') === null) {
                $goal->current_amount_encrypted = '0';
            }
        });

        static::created(function (FinancialGoal $goal) {
            DB::transaction(function () use ($goal) {
                Account::create([
                    'user_id'           => $goal->user_id,
                    'name'              => $goal->name,
                    'type'              => 'goal',
                    'balance_encrypted' => 0,
                    'currency'          => 'BRL',
                    'is_internal'       => true,
                    'goal_id'           => $goal->id,
                ]);
            });
        });

        static::updated(function (FinancialGoal $goal) {
            if ($goal->wasChanged('name') && $goal->virtualAccount) {
                $goal->virtualAccount->update(['name' => $goal->name]);
            }
        });

        static::deleting(function (FinancialGoal $goal) {
            $goal->virtualAccount?->delete();
        });
    }

    protected $fillable = [
        'user_id', 'name', 'icon', 'color', 'note',
        'target_amount_encrypted', 'current_amount_encrypted', 'monthly_amount_encrypted',
        'category', 'deadline', 'is_completed', 'is_archived', 'status',
    ];

    protected function casts(): array
    {
        return [
            'target_amount_encrypted' => EncryptedCast::class,
            'current_amount_encrypted' => EncryptedCast::class,
            'monthly_amount_encrypted' => EncryptedCast::class,
            'deadline' => 'date',
            'is_completed' => 'boolean',
            'is_archived' => 'boolean',
        ];
    }

    public function getMonthlyAmountAttribute(): float
    {
        return (float) ($this->monthly_amount_encrypted ?? 0);
    }

    public function getMonthsLeftAttribute(): int
    {
        if (!$this->deadline) return 0;
        return (int) max(0, now()->diffInMonths($this->deadline, false));
    }

    public function getSuggestedMonthlyAttribute(): float
    {
        $remaining = (float) $this->target_amount_encrypted - $this->current_amount;
        $months    = $this->months_left;
        return $months > 0 ? round($remaining / $months, 2) : 0;
    }

    public function getCurrentAmountAttribute(): float
    {
        return (float) ($this->virtualAccount?->current_balance ?? 0);
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

    public function virtualAccount()
    {
        return $this->hasOne(Account::class, 'goal_id');
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
