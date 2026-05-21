<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InstallmentPlan extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'account_id', 'description', 'total_amount_encrypted',
        'installments', 'first_due_on', 'category',
    ];

    protected function casts(): array
    {
        return [
            'total_amount_encrypted' => EncryptedCast::class,
            'first_due_on'           => 'date',
            'installments'           => 'integer',
        ];
    }

    public function user()         { return $this->belongsTo(User::class); }
    public function account()      { return $this->belongsTo(Account::class); }
    public function transactions() { return $this->hasMany(Transaction::class); }
}
