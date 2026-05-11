<?php

namespace Database\Factories;

use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use Illuminate\Database\Eloquent\Factories\Factory;

class HabitCheckInFactory extends Factory
{
    protected $model = HabitCheckIn::class;

    public function definition(): array
    {
        return [
            'habit_id' => Habit::factory(),
            'date'     => today()->toDateString(),
        ];
    }
}
