<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_cannot_be_edited_via_api(): void
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 500000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->postJson("/finance/accounts/{$source->id}/transactions", [
            'type'                   => 'transfer',
            'amount_encrypted'       => 100000,
            'description'            => 'Original',
            'occurred_at'            => '2026-05-15',
            'transfer_to_account_id' => $dest->id,
        ]);

        $transfer = $source->transactions()->where('type', 'transfer')->first();
        $this->assertNotNull($transfer, 'A transferência inicial não foi criada');

        $response = $this->actingAs($user)->patchJson("/finance/transactions/{$transfer->id}", [
            'amount_encrypted' => 999999,
            'description'      => 'Hack',
        ]);

        $response->assertStatus(422);

        // Valores originais permanecem
        $fresh = $transfer->fresh();
        $this->assertSame(100000.0, (float) $fresh->amount_encrypted);
        $this->assertSame('Original', $fresh->description);
    }

    public function test_non_transfer_can_still_be_edited(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 100000]);

        $tx = $account->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 5000,
            'description'      => 'Original',
            'occurred_at'      => '2026-05-15',
        ]);

        $response = $this->actingAs($user)->patchJson("/finance/transactions/{$tx->id}", [
            'amount_encrypted' => 7500,
            'description'      => 'Editada',
        ]);

        $response->assertStatus(302);
        $this->assertSame('Editada', $tx->fresh()->description);
    }
}
