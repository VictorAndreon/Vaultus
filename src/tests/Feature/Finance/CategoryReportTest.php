<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_page_renders_with_expected_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/finance/reports')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Finance/Reports')
                ->has('categories')
                ->has('total_expense')
                ->has('total_income')
                ->has('from')
                ->has('to')
            );
    }

    public function test_report_aggregates_expenses_by_category_in_period(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 10000]);

        $acc->transactions()->create(['type' => 'expense', 'amount_encrypted' => 500, 'description' => 'Mercado A', 'category' => 'Alimentação', 'occurred_at' => '2026-04-10']);
        $acc->transactions()->create(['type' => 'expense', 'amount_encrypted' => 300, 'description' => 'Mercado B', 'category' => 'Alimentação', 'occurred_at' => '2026-04-20']);
        $acc->transactions()->create(['type' => 'expense', 'amount_encrypted' => 200, 'description' => 'Uber',     'category' => 'Transporte',  'occurred_at' => '2026-04-15']);
        $acc->transactions()->create(['type' => 'income',  'amount_encrypted' => 5000, 'description' => 'Salário', 'category' => 'Salário',     'occurred_at' => '2026-04-05']);

        $response = $this->actingAs($user)->get('/finance/reports?from=2026-04-01&to=2026-04-30');

        $response->assertInertia(fn ($page) => $page
            ->where('total_expense', 1000)
            ->where('total_income', 5000)
            ->has('categories', 2)
            ->where('categories.0.name', 'Alimentação')
            ->where('categories.0.total', 800)
            ->where('categories.0.count', 2)
            ->where('categories.0.pct', 80)
            ->where('categories.1.name', 'Transporte')
            ->where('categories.1.total', 200)
            ->where('categories.1.pct', 20)
        );
    }

    public function test_report_groups_uncategorized_expenses_as_outros(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);

        $acc->transactions()->create(['type' => 'expense', 'amount_encrypted' => 100, 'description' => 'Sem categoria', 'category' => null, 'occurred_at' => '2026-04-10']);
        $acc->transactions()->create(['type' => 'expense', 'amount_encrypted' => 50,  'description' => 'Vazio',         'category' => '',   'occurred_at' => '2026-04-11']);

        $response = $this->actingAs($user)->get('/finance/reports?from=2026-04-01&to=2026-04-30');

        $response->assertInertia(fn ($page) => $page
            ->where('categories.0.name', 'Outros')
            ->where('categories.0.total', 150)
        );
    }

    public function test_report_ignores_transfers(): void
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post("/finance/accounts/{$source->id}/transactions", [
            'type'                   => 'transfer',
            'amount_encrypted'       => 800,
            'description'            => 'PIX',
            'occurred_at'            => '2026-04-10',
            'transfer_to_account_id' => $dest->id,
        ]);

        $response = $this->actingAs($user)->get('/finance/reports?from=2026-04-01&to=2026-04-30');

        $response->assertInertia(fn ($page) => $page
            ->where('total_expense', 0)
            ->has('categories', 0)
        );
    }

    public function test_report_respects_user_isolation(): void
    {
        $u1   = User::factory()->create();
        $u2   = User::factory()->create();
        $acc1 = Account::factory()->create(['user_id' => $u1->id, 'type' => 'checking', 'balance_encrypted' => 1000]);
        $acc1->transactions()->create(['type' => 'expense', 'amount_encrypted' => 200, 'description' => 'do u1', 'category' => 'Alimentação', 'occurred_at' => '2026-04-10']);

        $response = $this->actingAs($u2)->get('/finance/reports?from=2026-04-01&to=2026-04-30');

        $response->assertInertia(fn ($page) => $page
            ->where('total_expense', 0)
            ->has('categories', 0)
        );
    }
}
