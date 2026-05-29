<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Notes\Models\Notebook;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotebookFactory extends Factory
{
    protected $model = Notebook::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->randomElement(['Inbox', 'Ideias', 'Referência', 'Design', 'Pesquisa']),
            'color' => fake()->randomElement(['#7ec27b', '#d4a55a', '#7faecf', '#c87a8e']),
        ];
    }
}
