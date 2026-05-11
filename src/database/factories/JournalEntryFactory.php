<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Journal\Models\JournalEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalEntryFactory extends Factory
{
    protected $model = JournalEntry::class;

    public function definition(): array
    {
        return [
            'user_id'          => User::factory(),
            'date'             => today()->toDateString(),
            'content'          => '<p>' . fake()->paragraph() . '</p>',
            'tags'             => [],
            'health_metric_id' => null,
        ];
    }
}
