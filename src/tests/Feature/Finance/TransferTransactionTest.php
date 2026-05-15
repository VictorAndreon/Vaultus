<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferTransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_creates_two_linked_transactions()
    {
        $user    = User::factory()->create();
        $source  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest    = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                   => 'transfer',
            'amount_encrypted'       => 1000,
            'description'            => 'Reserva mensal',
            'occurred_at'            => '2026-05-15',
            'transfer_to_account_id' => $dest->id,
        ]);

        $this->assertDatabaseHas('transactions', [
            'account_id' => $source->id,
            'type'       => 'transfer',
        ]);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $dest->id,
            'type'       => 'transfer',
        ]);
    }

    public function test_transfer_does_not_inflate_month_income_or_expense()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                   => 'transfer',
            'amount_encrypted'       => 1000,
            'description'            => 'Transferência',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('month_income', 0)
                 ->where('month_expense', 0)
        );
    }

    public function test_transfer_preserves_total_balance()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 2000]);

        $this->actingAs($user)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                   => 'transfer',
            'amount_encrypted'       => 1000,
            'description'            => 'Reserva',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        // Net worth permanece 7000 (5000 + 2000)
        $response->assertInertia(fn ($page) =>
            $page->where('net_worth', 7000)
        );
    }

    public function test_transfer_to_another_users_account_is_forbidden()
    {
        $user1  = User::factory()->create();
        $user2  = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user1->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user2->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $response = $this->actingAs($user1)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                   => 'transfer',
            'amount_encrypted'       => 500,
            'description'            => 'Hack',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $response->assertStatus(422);
    }
}
