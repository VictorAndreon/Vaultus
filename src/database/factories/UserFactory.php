<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => 'password',
            'timezone' => 'UTC',
            'dashboard_preferences' => [],
            'remember_token' => Str::random(10),
        ];
    }
}
