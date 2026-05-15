<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;

class UpcomingPayment extends Model
{
    protected $fillable = [
        'user_id', 'description', 'amount_encrypted', 'due_date', 'tag', 'linked_goal_id',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
            'due_date'         => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function linkedGoal()
    {
        return $this->belongsTo(FinancialGoal::class, 'linked_goal_id');
    }
}
