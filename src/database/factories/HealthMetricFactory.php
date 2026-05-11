<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\HealthMetric;
use Illuminate\Database\Eloquent\Factories\Factory;

class HealthMetricFactory extends Factory
{
    protected $model = HealthMetric::class;

    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'date'         => today()->toDateString(),
            'mood'         => null,
            'energy'       => null,
            'sleep_hours'  => null,
            'water_liters' => null,
            'weight_kg'    => null,
            'notes'        => null,
        ];
    }
}
