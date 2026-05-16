<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_account_writes_audit_entry(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/finance/accounts', [
            'name'              => 'Nova conta',
            'type'              => 'checking',
            'balance_encrypted' => 100000,
            'currency'          => 'BRL',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event'   => 'finance.account.created',
        ]);
    }

    public function test_creating_transaction_writes_audit_entry(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", [
            'type'             => 'expense',
            'amount_encrypted' => 5000,
            'description'      => 'Padaria',
            'occurred_at'      => '2026-05-15',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event'   => 'finance.transaction.created',
        ]);
    }

    public function test_deleting_transaction_writes_audit_entry(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);
        $tx      = $account->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 1000,
            'description'      => 'X',
            'occurred_at'      => '2026-05-01',
        ]);

        $this->actingAs($user)->deleteJson("/finance/transactions/{$tx->id}");

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event'   => 'finance.transaction.deleted',
        ]);
    }
}
