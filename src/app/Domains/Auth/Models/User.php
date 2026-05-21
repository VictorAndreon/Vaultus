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

    public function journalEntries()
    {
        return $this->hasMany(\App\Domains\Journal\Models\JournalEntry::class);
    }

    public function journalPrompts()
    {
        return $this->hasMany(\App\Domains\Journal\Models\JournalPrompt::class);
    }

    public function accounts()
    {
        return $this->hasMany(\App\Domains\Finance\Models\Account::class);
    }

    public function financialGoals()
    {
        return $this->hasMany(\App\Domains\Finance\Models\FinancialGoal::class);
    }

    public function wishlistItems()
    {
        return $this->hasMany(\App\Domains\Finance\Models\WishlistItem::class);
    }

    public function budgetCategories()
    {
        return $this->hasMany(\App\Domains\Finance\Models\BudgetCategory::class)->orderBy('position');
    }

    public function upcomingPayments()
    {
        return $this->hasMany(\App\Domains\Finance\Models\UpcomingPayment::class);
    }

    public function recurringRules()
    {
        return $this->hasMany(\App\Domains\Finance\Models\RecurringRule::class);
    }

    public function projects()
    {
        return $this->hasMany(\App\Domains\Projects\Models\Project::class);
    }

    public function wants()
    {
        return $this->hasMany(\App\Domains\Projects\Models\Want::class);
    }

    public function libraryItems()
    {
        return $this->hasMany(\App\Domains\Library\Models\LibraryItem::class);
    }
}
