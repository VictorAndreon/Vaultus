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
}
