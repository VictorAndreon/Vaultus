<?php

namespace App\Domains\Contacts\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'email', 'phone', 'photo', 'birthday',
        'context', 'next_step', 'last_contacted_at', 'remind_after_days', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'last_contacted_at' => 'date',
            'remind_after_days' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function newFactory()
    {
        return \Database\Factories\ContactFactory::new();
    }
}
