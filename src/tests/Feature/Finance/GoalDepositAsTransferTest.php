<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalDepositAsTransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_deposit_creates_transfer_pair()
    {
        $user    = User::factory()->create();
        $source  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal    = $user->financialGoals()->create([
            'name'                    => 'Reserva',
            'target_amount_encrypted' => 10000,
        ]);
        $virtual = $goal->virtualAccount;

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 500,
            'account_id' => $source->id,
        ]);

        $this->assertDatabaseHas('transactions', [
            'account_id'             => $source->id,
            'type'                   => 'transfer',
            'transfer_to_account_id' => $virtual->id,
        ]);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $virtual->id,
            'type'       => 'transfer',
        ]);
    }

    public function test_deposit_preserves_net_worth()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 3000,
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 800,
            'account_id' => $source->id,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('net_worth', 5000)
        );
    }

    public function test_deposit_increases_goal_current_amount()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Carro',
            'target_amount_encrypted' => 30000,
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 1200,
            'account_id' => $source->id,
        ]);

        $this->assertSame(1200.0, (float) $goal->fresh()->current_amount);
    }

    public function test_deposit_requires_account_id()
    {
        $user = User::factory()->create();
        $goal = $user->financialGoals()->create([
            'name'                    => 'Sem origem',
            'target_amount_encrypted' => 1000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/finance/goals/{$goal->id}/deposit", ['amount' => 100]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('account_id');
    }

    public function test_deposit_from_another_users_account_is_forbidden()
    {
        $user1  = User::factory()->create();
        $user2  = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user2->id, 'type' => 'checking']);
        $goal   = $user1->financialGoals()->create([
            'name'                    => 'Privada',
            'target_amount_encrypted' => 5000,
        ]);

        $response = $this->actingAs($user1)
            ->postJson("/finance/goals/{$goal->id}/deposit", [
                'amount'     => 100,
                'account_id' => $source->id,
            ]);

        $response->assertStatus(422);
    }

    public function test_deposit_from_internal_account_is_rejected()
    {
        $user = User::factory()->create();
        $goalSource = $user->financialGoals()->create([
            'name'                    => 'Origem virtual',
            'target_amount_encrypted' => 10000,
        ]);
        $goalDest = $user->financialGoals()->create([
            'name'                    => 'Destino',
            'target_amount_encrypted' => 5000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/finance/goals/{$goalDest->id}/deposit", [
                'amount'     => 100,
                'account_id' => $goalSource->virtualAccount->id,
            ]);

        $response->assertStatus(422);
    }

    public function test_deposit_persists_custom_occurred_at()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Com data',
            'target_amount_encrypted' => 10000,
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'      => 200,
            'account_id'  => $source->id,
            'occurred_at' => '2026-03-15',
        ]);

        $this->assertDatabaseHas('transactions', [
            'account_id'             => $source->id,
            'transfer_to_account_id' => $goal->virtualAccount->id,
            'occurred_at'            => '2026-03-15',
        ]);
    }

    public function test_deposit_without_occurred_at_uses_user_timezone_not_utc()
    {
        // Em UTC já é 02/06 01:30; em São Paulo (UTC-3) ainda é 01/06 22:30.
        $user   = User::factory()->create(['timezone' => 'America/Sao_Paulo']);
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Sem data',
            'target_amount_encrypted' => 10000,
        ]);

        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-06-02 01:30:00', 'UTC'), function () use ($user, $source, $goal) {
            $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
                'amount'     => 200,
                'account_id' => $source->id,
            ]);
        });

        // O aporte deve ser datado com o "hoje" local (01/06), não a data UTC (02/06).
        $this->assertDatabaseHas('transactions', [
            'account_id'             => $source->id,
            'transfer_to_account_id' => $goal->virtualAccount->id,
            'occurred_at'            => '2026-06-01',
        ]);
    }

    public function test_deposit_above_source_balance_is_rejected()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 100]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Sem cobertura',
            'target_amount_encrypted' => 5000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/finance/goals/{$goal->id}/deposit", [
                'amount'     => 500,
                'account_id' => $source->id,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('amount');
        $this->assertSame(0.0, (float) $goal->fresh()->current_amount);
        $this->assertDatabaseMissing('transactions', [
            'account_id'             => $source->id,
            'transfer_to_account_id' => $goal->virtualAccount->id,
        ]);
    }

    public function test_deposit_from_liability_account_is_rejected()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Sem aporte de dívida',
            'target_amount_encrypted' => 5000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/finance/goals/{$goal->id}/deposit", [
                'amount'     => 100,
                'account_id' => $source->id,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('account_id');
    }

    public function test_deposit_equal_to_source_balance_is_allowed()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 300]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Aporte exato',
            'target_amount_encrypted' => 1000,
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 300,
            'account_id' => $source->id,
        ])->assertRedirect();

        $this->assertSame(300.0, (float) $goal->fresh()->current_amount);
    }

    public function test_deposit_persists_custom_note_as_description()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Com nota',
            'target_amount_encrypted' => 10000,
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 300,
            'account_id' => $source->id,
            'note'       => 'Aporte do bônus',
        ]);

        $this->assertDatabaseHas('transactions', [
            'account_id'             => $source->id,
            'transfer_to_account_id' => $goal->virtualAccount->id,
            'description'            => 'Aporte do bônus',
        ]);
    }
}
