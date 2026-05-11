<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use Illuminate\Database\Eloquent\Factories\Factory;

class HabitFactory extends Factory
{
    protected $model = Habit::class;

    public function definition(): array
    {
        return [
            'user_id'         => User::factory(),
            'name'            => fake()->words(2, true),
            'icon'            => '⭐',
            'frequency_type'  => 'daily',
            'frequency_days'  => null,
            'frequency_times' => null,
            'category'        => null,
            'current_streak'  => 0,
            'best_streak'     => 0,
            'is_active'       => true,
        ];
    }

    public function weekly(array $days = [1, 3, 5]): static
    {
        return $this->state(['frequency_type' => 'weekly', 'frequency_days' => $days]);
    }

    public function xPerWeek(int $times = 3): static
    {
        return $this->state(['frequency_type' => 'x_per_week', 'frequency_times' => $times]);
    }
}
