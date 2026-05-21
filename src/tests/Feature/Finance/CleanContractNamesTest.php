<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Garante que os endpoints HTTP aceitam tanto os nomes limpos do contrato externo
 * (amount, balance, credit_limit, estimated_price) quanto os antigos *_encrypted
 * (legado a ser removido em um próximo sprint).
 */
class CleanContractNamesTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_store_accepts_clean_balance_name(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/accounts', [
                'name'     => 'Limpinha',
                'type'     => 'checking',
                'balance'  => 1234.56,
                'currency' => 'BRL',
            ])
            ->assertRedirect();

        $acc = $user->accounts()->where('name', 'Limpinha')->firstOrFail();
        $this->assertSame(1234.56, (float) $acc->balance_encrypted);
    }

    public function test_transaction_store_accepts_clean_amount_name(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        $this->actingAs($user)
            ->post("/finance/accounts/{$acc->id}/transactions", [
                'type'        => 'expense',
                'amount'      => 99.90,
                'description' => 'Café',
                'occurred_at' => '2026-05-10',
            ])
            ->assertRedirect();

        $tx = $acc->transactions()->where('description', 'Café')->firstOrFail();
        $this->assertSame(99.90, (float) $tx->amount_encrypted);
    }

    public function test_transaction_update_accepts_clean_amount_name(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $tx   = $acc->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 50,
            'description'      => 'X',
            'occurred_at'      => '2026-05-10',
        ]);

        $this->actingAs($user)
            ->patch("/finance/transactions/{$tx->id}", ['amount' => 75.25])
            ->assertRedirect();

        $this->assertSame(75.25, (float) $tx->fresh()->amount_encrypted);
    }

    public function test_account_store_accepts_clean_credit_limit_name(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/accounts', [
                'name'         => 'Cartão',
                'type'         => 'credit',
                'balance'      => 0,
                'currency'     => 'BRL',
                'credit_limit' => 9000,
            ])
            ->assertRedirect();

        $card = $user->accounts()->where('name', 'Cartão')->firstOrFail();
        $this->assertSame(9000.0, (float) $card->credit_limit_encrypted);
    }

    public function test_wishlist_store_accepts_clean_estimated_price_name(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/wishlist', [
                'name'             => 'Item',
                'estimated_price'  => 1500,
                'priority'         => 'medium',
            ])
            ->assertRedirect();

        $item = $user->wishlistItems()->where('name', 'Item')->firstOrFail();
        $this->assertSame(1500.0, (float) $item->estimated_price_encrypted);
    }

    public function test_legacy_encrypted_names_still_work_for_backward_compatibility(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/accounts', [
                'name'              => 'Legado',
                'type'              => 'checking',
                'balance_encrypted' => 500,
                'currency'          => 'BRL',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('accounts', ['name' => 'Legado']);
    }
}
