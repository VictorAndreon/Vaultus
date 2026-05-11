<?php

namespace App\Domains\Habits\Models;

use App\Domains\Auth\Models\User;
use Database\Factories\HealthMetricFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthMetric extends Model
{
    use HasFactory;

    protected static function newFactory(): HealthMetricFactory
    {
        return HealthMetricFactory::new();
    }

    protected $fillable = [
        'user_id', 'date', 'sleep_hours', 'weight_kg',
        'mood', 'energy', 'water_liters', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date'         => 'date',
            'mood'         => 'integer',
            'energy'       => 'integer',
            'sleep_hours'  => 'decimal:2',
            'water_liters' => 'decimal:2',
            'weight_kg'    => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
