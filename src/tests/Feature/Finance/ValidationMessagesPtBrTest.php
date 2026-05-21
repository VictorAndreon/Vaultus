<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ValidationMessagesPtBrTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_balance_required_message_is_in_portuguese(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/finance/accounts', [
                'name'     => 'Sem saldo',
                'type'     => 'checking',
                'currency' => 'BRL',
            ]);

        $response->assertStatus(422);
        $errors = $response->json('errors.balance_encrypted.0');
        $this->assertStringContainsString('saldo', mb_strtolower($errors));
        $this->assertStringNotContainsString('encrypted', mb_strtolower($errors));
    }

    public function test_transaction_amount_min_message_is_in_portuguese(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        $response = $this->actingAs($user)
            ->postJson("/finance/accounts/{$account->id}/transactions", [
                'type'             => 'expense',
                'amount_encrypted' => 0,
                'description'      => 'Zero',
                'occurred_at'      => '2026-05-10',
            ]);

        $response->assertStatus(422);
        $errors = $response->json('errors.amount_encrypted.0');
        $this->assertStringContainsString('valor', mb_strtolower($errors));
        $this->assertStringNotContainsString('encrypted', mb_strtolower($errors));
    }
}
