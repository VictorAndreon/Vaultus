<?php

namespace App\Domains\Auth\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens;

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    protected $fillable = [
        'name', 'email', 'password', 'timezone', 'dashboard_preferences',
        'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at',
    ];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted',
            'dashboard_preferences' => 'array',
            'password' => 'hashed',
        ];
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function habits()
    {
        return $this->hasMany(\App\Domains\Habits\Models\Habit::class);
    }
}
