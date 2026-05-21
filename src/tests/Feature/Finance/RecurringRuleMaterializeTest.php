<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\RecurringRule;
use App\Domains\Finance\Services\RecurringRuleMaterializer;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringRuleMaterializeTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_materialize_creates_transaction_on_due_day(): void
    {
        Carbon::setTestNow('2026-05-15');

        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $rule = $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 1200,
            'description'      => 'Aluguel',
            'category'         => 'Moradia',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
            'is_active'        => true,
        ]);

        app(RecurringRuleMaterializer::class)->run();

        $this->assertDatabaseHas('transactions', [
            'account_id'  => $acc->id,
            'type'        => 'expense',
            'description' => 'Aluguel',
            'occurred_at' => '2026-05-05',
        ]);
        $this->assertSame('2026-05-05', $rule->fresh()->last_run_on->toDateString());
    }

    public function test_materialize_does_not_duplicate_when_already_materialized_this_month(): void
    {
        Carbon::setTestNow('2026-05-20');

        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 1200,
            'description'      => 'Aluguel',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
            'last_run_on'      => '2026-05-05',
            'is_active'        => true,
        ]);

        app(RecurringRuleMaterializer::class)->run();

        $this->assertSame(0, $acc->transactions()->count());
    }

    public function test_materialize_skips_when_due_day_is_in_the_future(): void
    {
        Carbon::setTestNow('2026-05-03');

        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 100,
            'description'      => 'Antes do dia',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
            'is_active'        => true,
        ]);

        app(RecurringRuleMaterializer::class)->run();

        $this->assertSame(0, $acc->transactions()->count());
    }

    public function test_materialize_skips_inactive_rule(): void
    {
        Carbon::setTestNow('2026-05-15');

        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 100,
            'description'      => 'Pausada',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
            'is_active'        => false,
        ]);

        app(RecurringRuleMaterializer::class)->run();

        $this->assertSame(0, $acc->transactions()->count());
    }

    public function test_materialize_skips_after_ends_on(): void
    {
        Carbon::setTestNow('2026-05-15');

        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 100,
            'description'      => 'Encerrada',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
            'ends_on'          => '2026-04-30',
            'is_active'        => true,
        ]);

        app(RecurringRuleMaterializer::class)->run();

        $this->assertSame(0, $acc->transactions()->count());
    }

    public function test_materialize_clamps_day_of_month_to_last_day_when_month_is_shorter(): void
    {
        Carbon::setTestNow('2026-02-28'); // 2026 não é bissexto

        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 50,
            'description'      => 'Streaming',
            'day_of_month'     => 31,
            'starts_on'        => '2026-01-01',
            'is_active'        => true,
        ]);

        app(RecurringRuleMaterializer::class)->run();

        $this->assertDatabaseHas('transactions', [
            'account_id'  => $acc->id,
            'description' => 'Streaming',
            'occurred_at' => '2026-02-28',
        ]);
    }

    public function test_materialize_idempotent_when_run_twice_same_day(): void
    {
        Carbon::setTestNow('2026-05-10');

        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'income',
            'amount_encrypted' => 5000,
            'description'      => 'Salário',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
            'is_active'        => true,
        ]);

        app(RecurringRuleMaterializer::class)->run();
        app(RecurringRuleMaterializer::class)->run();

        $this->assertSame(1, $acc->transactions()->count());
    }
}
