<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Journal\Models\JournalPrompt;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalPromptFactory extends Factory
{
    protected $model = JournalPrompt::class;

    public function definition(): array
    {
        return [
            'user_id'   => User::factory(),
            'content'   => fake()->sentence(),
            'is_active' => true,
            'position'  => 0,
        ];
    }
}
