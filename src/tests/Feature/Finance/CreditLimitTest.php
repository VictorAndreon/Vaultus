<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_expense_within_credit_limit_is_accepted(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 1000,
        ]);

        $this->actingAs($user)
            ->post("/finance/accounts/{$card->id}/transactions", [
                'type' => 'expense', 'amount' => 800,
                'description' => 'Compra', 'occurred_at' => '2026-05-10',
            ])
            ->assertRedirect();

        $this->assertSame(800.0, (float) $card->fresh()->current_balance);
    }

    public function test_expense_exceeding_credit_limit_is_rejected(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 1000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/finance/accounts/{$card->id}/transactions", [
                'type' => 'expense', 'amount' => 1500,
                'description' => 'Estouro', 'occurred_at' => '2026-05-10',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('amount');
        $this->assertSame(0, $card->transactions()->count());
    }

    public function test_expense_that_would_exceed_remaining_limit_is_rejected(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 700,
            'credit_limit_encrypted' => 1000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/finance/accounts/{$card->id}/transactions", [
                'type' => 'expense', 'amount' => 400,
                'description' => 'Estouro parcial', 'occurred_at' => '2026-05-10',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('amount');
    }

    public function test_card_without_credit_limit_is_unlimited(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => null,
        ]);

        $this->actingAs($user)
            ->post("/finance/accounts/{$card->id}/transactions", [
                'type' => 'expense', 'amount' => 999999,
                'description' => 'Sem limite cadastrado', 'occurred_at' => '2026-05-10',
            ])
            ->assertRedirect();
    }

    public function test_limit_does_not_apply_to_non_credit_account(): void
    {
        $user = User::factory()->create();
        $acc = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 100,
        ]);

        // Checking pode ficar negativo (sem cheque-especial regrado neste app) — não há limite a aplicar
        $this->actingAs($user)
            ->post("/finance/accounts/{$acc->id}/transactions", [
                'type' => 'expense', 'amount' => 999,
                'description' => 'Saque ampliado', 'occurred_at' => '2026-05-10',
            ])
            ->assertRedirect();
    }
}
