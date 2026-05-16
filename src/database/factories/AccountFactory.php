<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    protected $model = Account::class;

    public function definition(): array
    {
        return [
            'user_id'           => User::factory(),
            'name'              => fake()->words(2, true),
            'type'              => fake()->randomElement(['checking', 'savings', 'investment', 'cash']),
            'balance_encrypted' => fake()->randomFloat(2, 0, 10000),
            'currency'          => 'BRL',
        ];
    }

    public function goalAccount(): static
    {
        return $this->state(fn () => [
            'type'        => 'goal',
            'is_internal' => true,
        ]);
    }
}
