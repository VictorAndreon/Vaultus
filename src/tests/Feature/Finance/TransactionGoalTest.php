<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\Transaction;
use App\Domains\Finance\Models\TransactionGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionGoalTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_allocate_transaction_to_goal(): void
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Nubank',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);
        $transaction = Transaction::create([
            'account_id'       => $account->id,
            'type'             => 'income',
            'amount_encrypted' => 500.00,
            'description'      => 'Salário',
            'category'         => 'Salário',
            'occurred_at'      => '2026-05-01',
        ]);
        $goal = FinancialGoal::create([
            'user_id'                 => $user->id,
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 5000.00,
            'category'                => 'Lazer',
        ]);

        $this->actingAs($user)
            ->post("/finance/transactions/{$transaction->id}/allocations", [
                'financial_goal_id' => $goal->id,
                'amount_encrypted'  => 100.00,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('transaction_goal', [
            'transaction_id'    => $transaction->id,
            'financial_goal_id' => $goal->id,
        ]);
    }

    public function test_can_delete_allocation(): void
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Nubank',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);
        $transaction = Transaction::create([
            'account_id'       => $account->id,
            'type'             => 'income',
            'amount_encrypted' => 500.00,
            'description'      => 'Salário',
            'category'         => 'Salário',
            'occurred_at'      => '2026-05-01',
        ]);
        $goal = FinancialGoal::create([
            'user_id'                 => $user->id,
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 5000.00,
            'category'                => 'Lazer',
        ]);
        $allocation = TransactionGoal::create([
            'transaction_id'    => $transaction->id,
            'financial_goal_id' => $goal->id,
            'amount_encrypted'  => 100.00,
        ]);

        $this->actingAs($user)
            ->delete("/finance/allocations/{$allocation->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('transaction_goal', ['id' => $allocation->id]);
    }

    public function test_cannot_allocate_to_other_users_goal(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $account = Account::create([
            'user_id'           => $user2->id,
            'name'              => 'Conta User2',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);
        $transaction = Transaction::create([
            'account_id'       => $account->id,
            'type'             => 'income',
            'amount_encrypted' => 500.00,
            'description'      => 'Salário',
            'category'         => 'Salário',
            'occurred_at'      => '2026-05-01',
        ]);
        $goalUser1 = FinancialGoal::create([
            'user_id'                 => $user1->id,
            'name'                    => 'Meta User1',
            'target_amount_encrypted' => 5000.00,
            'category'                => 'Lazer',
        ]);

        $this->actingAs($user2)
            ->post("/finance/transactions/{$transaction->id}/allocations", [
                'financial_goal_id' => $goalUser1->id,
                'amount_encrypted'  => 100.00,
            ])
            ->assertNotFound();
    }

    public function test_cannot_delete_other_users_allocation(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $account = Account::create([
            'user_id'           => $user1->id,
            'name'              => 'Conta User1',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);
        $transaction = Transaction::create([
            'account_id'       => $account->id,
            'type'             => 'income',
            'amount_encrypted' => 500.00,
            'description'      => 'Salário',
            'category'         => 'Salário',
            'occurred_at'      => '2026-05-01',
        ]);
        $goal = FinancialGoal::create([
            'user_id'                 => $user1->id,
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 5000.00,
            'category'                => 'Lazer',
        ]);
        $allocation = TransactionGoal::create([
            'transaction_id'    => $transaction->id,
            'financial_goal_id' => $goal->id,
            'amount_encrypted'  => 100.00,
        ]);

        $this->actingAs($user2)
            ->delete("/finance/allocations/{$allocation->id}")
            ->assertForbidden();
    }
}
