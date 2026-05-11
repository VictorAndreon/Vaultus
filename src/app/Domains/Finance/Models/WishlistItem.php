<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WishlistItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'financial_goal_id', 'name', 'estimated_price_encrypted',
        'priority', 'url', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_price_encrypted' => EncryptedCast::class,
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function goal()
    {
        return $this->belongsTo(FinancialGoal::class, 'financial_goal_id');
    }
}
