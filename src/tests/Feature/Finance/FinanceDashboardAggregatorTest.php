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
            'transactions', 'goals', 'accounts_list', 'upcoming_payments', 'wishlist', 'month_label',
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

    public function test_goal_history_reflects_cumulative_balance_per_month(): void
    {
        \Carbon\Carbon::setTestNow('2026-05-20');

        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 10000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Histórico',
            'target_amount_encrypted' => 5000,
        ]);
        $virtual = $goal->virtualAccount;

        // Aporte 200 em mar/2026, 300 em abr/2026, 100 em mai/2026
        foreach ([['2026-03-10', 200], ['2026-04-15', 300], ['2026-05-05', 100]] as [$date, $amt]) {
            $out = $source->transactions()->create([
                'type' => 'transfer', 'amount_encrypted' => $amt, 'description' => 'a',
                'occurred_at' => $date, 'transfer_to_account_id' => $virtual->id,
            ]);
            $in  = $virtual->transactions()->create([
                'type' => 'transfer', 'amount_encrypted' => $amt, 'description' => 'a',
                'occurred_at' => $date, 'transfer_pair_id' => $out->id,
            ]);
            $out->update(['transfer_pair_id' => $in->id]);
        }

        $data = app(FinanceDashboardAggregator::class)->aggregate($user->fresh());
        $history = collect($data['goals'])->firstWhere('name', 'Histórico')['history'];

        $this->assertCount(12, $history);
        // Indices: 0=jun/2025 ... 11=mai/2026. Acumulativos:
        // jun/2025-fev/2026 = 0, mar/2026=200, abr/2026=500, mai/2026=600
        $this->assertSame(0.0,   $history[8]);  // fev/2026
        $this->assertSame(200.0, $history[9]);  // mar/2026
        $this->assertSame(500.0, $history[10]); // abr/2026
        $this->assertSame(600.0, $history[11]); // mai/2026 (atual)

        \Carbon\Carbon::setTestNow();
    }

    public function test_aggregate_returns_wishlist_with_linked_goal_name(): void
    {
        $user = User::factory()->create();
        $goal = $user->financialGoals()->create([
            'name'                    => 'Tech',
            'target_amount_encrypted' => 5000,
        ]);
        $user->wishlistItems()->create([
            'name'                      => 'Solo',
            'estimated_price_encrypted' => 800,
            'priority'                  => 'medium',
        ]);
        $user->wishlistItems()->create([
            'name'                      => 'Linkado',
            'estimated_price_encrypted' => 4500,
            'priority'                  => 'high',
            'financial_goal_id'         => $goal->id,
        ]);

        $data = app(FinanceDashboardAggregator::class)->aggregate($user->fresh());

        $this->assertArrayHasKey('wishlist', $data);
        $this->assertCount(2, $data['wishlist']);

        $linked = collect($data['wishlist'])->firstWhere('name', 'Linkado');
        $this->assertSame('Tech', $linked['goal_name']);
        $this->assertSame($goal->id, $linked['financial_goal_id']);
        $this->assertSame(4500.0, $linked['estimated_price']);

        $loose = collect($data['wishlist'])->firstWhere('name', 'Solo');
        $this->assertNull($loose['goal_name']);
    }

    public function test_recent_transactions_expose_occurred_at_and_account_id_for_editing(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 1000]);
        $acc->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 50,
            'description'      => 'Café',
            'occurred_at'      => '2026-05-10',
        ]);

        $data = app(FinanceDashboardAggregator::class)->aggregate($user->fresh());
        $tx   = $data['transactions'][0];

        $this->assertArrayHasKey('account_id', $tx);
        $this->assertArrayHasKey('occurred_at', $tx);
        $this->assertSame($acc->id, $tx['account_id']);
        $this->assertSame('2026-05-10', $tx['occurred_at']);
    }

    public function test_recent_transactions_deduplicates_transfer_pairs(): void
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post("/finance/accounts/{$source->id}/transactions", [
            'type'                   => 'transfer',
            'amount_encrypted'       => 500,
            'description'            => 'PIX para poupança',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $data = app(FinanceDashboardAggregator::class)->aggregate($user->fresh());

        $transfers = collect($data['transactions'])->where('type', 'transfer');
        $this->assertCount(1, $transfers, 'Esperava uma única linha por par de transferência');
    }

    public function test_dashboard_accepts_custom_period_for_income_expense_savings(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 10000]);

        $acc->transactions()->create(['type' => 'income',  'amount_encrypted' => 5000, 'description' => 'sal jan', 'occurred_at' => '2026-01-05']);
        $acc->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1000, 'description' => 'gas jan', 'occurred_at' => '2026-01-10']);
        $acc->transactions()->create(['type' => 'income',  'amount_encrypted' => 6000, 'description' => 'sal mai', 'occurred_at' => '2026-05-05']);
        $acc->transactions()->create(['type' => 'expense', 'amount_encrypted' => 2000, 'description' => 'gas mai', 'occurred_at' => '2026-05-10']);

        $this->actingAs($user)
            ->get('/finance?from=2026-01-01&to=2026-01-31')
            ->assertInertia(fn ($page) => $page
                ->where('month_income', 5000)
                ->where('month_expense', 1000)
                ->where('period_from', '2026-01-01')
                ->where('period_to', '2026-01-31')
            );
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
