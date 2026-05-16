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

    public function test_legacy_transaction_goal_deposits_are_migrated_to_transfers(): void
    {
        $user     = User::factory()->create();
        $checking = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Conta Corrente',
            'type'              => 'checking',
            'balance_encrypted' => 5000.00,
            'currency'          => 'BRL',
        ]);
        $goal = FinancialGoal::create([
            'user_id'                 => $user->id,
            'name'                    => 'Legado',
            'target_amount_encrypted' => 10000.00,
        ]);
        $virtual = $goal->virtualAccount;

        // Simula aporte legado: TransactionGoal sem transaction_id
        \DB::table('transaction_goal')->insert([
            'financial_goal_id' => $goal->id,
            'transaction_id'    => null,
            'amount_encrypted'  => encrypt('300'),
            'occurred_at'       => '2026-04-01',
            'note'              => 'Aporte manual legado',
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // Instancia e executa a migration diretamente para evitar re-execução de migrations já rodadas
        $migration = require base_path('database/migrations/2026_05_16_000002_backfill_goal_virtual_accounts.php');
        $migration->up();

        // Após migração: existe transação de transfer saindo da checking para a virtual
        $this->assertDatabaseHas('transactions', [
            'account_id'             => $checking->id,
            'type'                   => 'transfer',
            'transfer_to_account_id' => $virtual->id,
        ]);

        // E o TransactionGoal legado foi removido
        $this->assertDatabaseMissing('transaction_goal', [
            'financial_goal_id' => $goal->id,
            'transaction_id'    => null,
        ]);
    }
}
