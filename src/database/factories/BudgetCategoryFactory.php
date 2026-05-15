<?php

namespace Database\Factories;

use App\Domains\Finance\Models\BudgetCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetCategoryFactory extends Factory
{
    protected $model = BudgetCategory::class;

    public function definition(): array
    {
        return [
            'user_id'                 => 1,
            'name'                    => $this->faker->word(),
            'budget_amount_encrypted' => $this->faker->numberBetween(100, 2000),
            'color'                   => 'var(--green)',
            'position'                => 0,
        ];
    }
}
