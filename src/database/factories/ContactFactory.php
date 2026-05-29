<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Contacts\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    protected $model = Contact::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name'    => fake()->name(),
            'email'   => fake()->safeEmail(),
            'phone'   => fake()->phoneNumber(),
            'photo'   => null,
            'birthday'=> fake()->date(),
            'context' => fake()->randomElement(['Família', 'Trabalho', 'Saúde', 'Casa']),
            'next_step' => fake()->optional()->sentence(fake()->numberBetween(3, 6)),
            'last_contacted_at' => fake()->optional()->dateTimeBetween('-90 days', 'now'),
            'remind_after_days' => fake()->optional()->numberBetween(7, 90),
            'notes'   => fake()->optional()->paragraph(),
        ];
    }
}
