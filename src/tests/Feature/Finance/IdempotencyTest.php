<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_idempotency_key_does_not_create_duplicate_transaction(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 100000]);

        $headers = ['Idempotency-Key' => 'tx-abc-123'];
        $body = [
            'type'             => 'expense',
            'amount_encrypted' => 1000,
            'description'      => 'Mercado',
            'occurred_at'      => '2026-05-15',
        ];

        $r1 = $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, $headers);
        $r2 = $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, $headers);

        // Inertia/Laravel writes retornam 302 redirect — semanticamente "operação OK".
        // 2xx ou 3xx servem como sucesso para idempotência.
        $r1->assertStatus(302);
        $r2->assertStatus(302);

        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_different_keys_create_separate_transactions(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 100000]);

        $body = ['type' => 'expense', 'amount_encrypted' => 500, 'description' => 'Mercado', 'occurred_at' => '2026-05-15'];

        $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, ['Idempotency-Key' => 'key-1']);
        $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, ['Idempotency-Key' => 'key-2']);

        $this->assertDatabaseCount('transactions', 2);
    }

    public function test_request_without_idempotency_key_still_works(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 100000]);

        $body = ['type' => 'expense', 'amount_encrypted' => 100, 'description' => 'Sem chave', 'occurred_at' => '2026-05-15'];

        $response = $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body);
        $response->assertStatus(302);
        $this->assertDatabaseCount('transactions', 1);
    }
}
