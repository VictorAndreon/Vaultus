<?php

namespace App\Domains\Habits\Models;

use App\Domains\Auth\Models\User;
use Carbon\CarbonInterface;
use Database\Factories\HabitFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Habit extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory(): HabitFactory
    {
        return HabitFactory::new();
    }

    protected $fillable = [
        'user_id', 'name', 'icon', 'frequency_type',
        'frequency_days', 'frequency_times', 'category',
        'current_streak', 'best_streak', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'frequency_days' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function checkIns()
    {
        return $this->hasMany(HabitCheckIn::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function isExpectedOn(CarbonInterface $date, string $timezone): bool
    {
        return match ($this->frequency_type) {
            'daily'      => true,
            'weekly'     => in_array($date->dayOfWeek, $this->frequency_days ?? []),
            'x_per_week' => true,
            default      => false,
        };
    }
}
