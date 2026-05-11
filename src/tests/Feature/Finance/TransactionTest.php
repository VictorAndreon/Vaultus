<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_income_transaction(): void
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Nubank',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);

        $this->actingAs($user)
            ->post("/finance/accounts/{$account->id}/transactions", [
                'type'             => 'income',
                'amount_encrypted' => '500.00',
                'description'      => 'Salário',
                'category'         => 'Salário',
                'occurred_at'      => '2026-05-01',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('transactions', [
            'account_id' => $account->id,
            'type'       => 'income',
        ]);
    }

    public function test_can_create_expense_transaction(): void
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Nubank',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);

        $this->actingAs($user)
            ->post("/finance/accounts/{$account->id}/transactions", [
                'type'             => 'expense',
                'amount_encrypted' => '150.00',
                'description'      => 'Mercado',
                'category'         => 'Alimentação',
                'occurred_at'      => '2026-05-02',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('transactions', [
            'account_id' => $account->id,
            'type'       => 'expense',
        ]);
    }

    public function test_can_update_transaction(): void
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
            'amount_encrypted' => 300.00,
            'description'      => 'Freelance',
            'category'         => 'Renda Extra',
            'occurred_at'      => '2026-05-03',
        ]);

        $this->actingAs($user)
            ->patch("/finance/transactions/{$transaction->id}", [
                'description' => 'Atualizado',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('transactions', [
            'id'          => $transaction->id,
            'description' => 'Atualizado',
        ]);
    }

    public function test_can_delete_transaction(): void
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
            'type'             => 'expense',
            'amount_encrypted' => 50.00,
            'description'      => 'Café',
            'category'         => 'Alimentação',
            'occurred_at'      => '2026-05-04',
        ]);

        $this->actingAs($user)
            ->delete("/finance/transactions/{$transaction->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('transactions', ['id' => $transaction->id]);
    }

    public function test_cannot_modify_other_users_transaction(): void
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
            'amount_encrypted' => 200.00,
            'description'      => 'Bônus',
            'category'         => 'Renda',
            'occurred_at'      => '2026-05-05',
        ]);

        $this->actingAs($user2)
            ->patch("/finance/transactions/{$transaction->id}", [
                'description' => 'Hackeado',
            ])
            ->assertForbidden();
    }

    public function test_balance_reflects_transactions(): void
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Nubank',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);

        Transaction::create([
            'account_id'       => $account->id,
            'type'             => 'income',
            'amount_encrypted' => 500.00,
            'description'      => 'Salário',
            'category'         => 'Salário',
            'occurred_at'      => '2026-05-01',
        ]);

        Transaction::create([
            'account_id'       => $account->id,
            'type'             => 'expense',
            'amount_encrypted' => 200.00,
            'description'      => 'Aluguel',
            'category'         => 'Moradia',
            'occurred_at'      => '2026-05-02',
        ]);

        $this->actingAs($user)
            ->get('/finance')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Finance/Index')
                ->where('accounts.data.0.current_balance', 1300)
            );
    }
}
