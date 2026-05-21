<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Services\FinanceDashboardAggregator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceDashboardAggregatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_aggregate_returns_all_expected_keys(): void
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 100000]);

        $aggregator = app(FinanceDashboardAggregator::class);
        $data = $aggregator->aggregate($user);

        foreach ([
            'net_worth', 'month_income', 'month_expense', 'savings_rate', 'savings_goal_pct',
            'flow_chart', 'donut', 'budgets', 'budget_category_names',
            'transactions', 'goals', 'accounts_list', 'upcoming_payments', 'month_label',
        ] as $key) {
            $this->assertArrayHasKey($key, $data, "Falta a chave '{$key}' no payload do aggregator");
        }
    }

    public function test_net_worth_sums_assets_minus_liabilities(): void
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 500000]);
        Account::factory()->create(['user_id' => $user->id, 'type' => 'credit',   'balance_encrypted' => 200000]);

        $data = app(FinanceDashboardAggregator::class)->aggregate($user);

        $this->assertSame(300000.0, (float) $data['net_worth']);
    }

    public function test_donut_pct_remains_correct_when_an_account_has_negative_balance(): void
    {
        $user       = User::factory()->create();
        $checking   = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 1000]);
        $investment = Account::factory()->create(['user_id' => $user->id, 'type' => 'investment', 'balance_encrypted' => 3000]);

        // Despesas zerando a conta corrente e deixando-a negativa
        $checking->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 1500,
            'description'      => 'Estouro',
            'occurred_at'      => now()->format('Y-m-d'),
        ]);

        $donut = collect(app(FinanceDashboardAggregator::class)->aggregate($user->fresh())['donut'])
            ->keyBy('label');

        $this->assertArrayHasKey('Investimentos', $donut);
        $this->assertSame(100, $donut['Investimentos']['pct']);
    }

    public function test_donut_excludes_assets_with_non_positive_balance(): void
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 2000]);
        $zeroed = Account::factory()->create(['user_id' => $user->id, 'type' => 'cash', 'balance_encrypted' => 0]);

        $labels = collect(app(FinanceDashboardAggregator::class)->aggregate($user->fresh())['donut'])
            ->pluck('label');

        $this->assertContains('Conta corrente', $labels);
        $this->assertNotContains('Dinheiro', $labels);
    }

    public function test_transfers_do_not_inflate_month_income_or_expense(): void
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 500000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post("/finance/accounts/{$source->id}/transactions", [
            'type'                   => 'transfer',
            'amount_encrypted'       => 100000,
            'description'            => 'Reserva',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $data = app(FinanceDashboardAggregator::class)->aggregate($user->fresh());

        $this->assertSame(0.0, (float) $data['month_income']);
        $this->assertSame(0.0, (float) $data['month_expense']);
    }
}
