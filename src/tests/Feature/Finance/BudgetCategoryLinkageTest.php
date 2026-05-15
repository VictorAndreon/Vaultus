<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\BudgetCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetCategoryLinkageTest extends TestCase
{
    use RefreshDatabase;

    public function test_budget_categories_are_passed_to_frontend()
    {
        $user = User::factory()->create();
        BudgetCategory::factory()->create(['user_id' => $user->id, 'name' => 'Alimentação', 'budget_amount_encrypted' => 1000, 'position' => 0]);
        BudgetCategory::factory()->create(['user_id' => $user->id, 'name' => 'Transporte',  'budget_amount_encrypted' => 400,  'position' => 1]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('budget_category_names')
                 ->where('budget_category_names', ['Alimentação', 'Transporte'])
        );
    }

    public function test_budget_spending_matches_transaction_category()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 5000]);
        BudgetCategory::factory()->create(['user_id' => $user->id, 'name' => 'Alimentação', 'budget_amount_encrypted' => 1000]);

        $account->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 350,
            'description'      => 'Supermercado',
            'category'         => 'Alimentação',
            'occurred_at'      => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('budgets.0.name', 'Alimentação')
                 ->where('budgets.0.spent', 350)
                 ->where('budgets.0.budget', 1000)
                 ->where('budgets.0.pct', 35)
        );
    }
}
