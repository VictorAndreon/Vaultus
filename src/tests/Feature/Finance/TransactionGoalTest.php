<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Os testes originais que exercitavam a alocação de transação a meta foram
 * removidos junto com as rotas (commit do Checkpoint 5 — Plano A). O fluxo
 * vivo de aporte está coberto em GoalDepositAsTransferTest.
 *
 * Aqui mantém-se apenas a regressão da migração legada — garantia de que
 * registros antigos em transaction_goal foram convertidos em pares de
 * transferência sem corromper valores nem perder timestamps.
 */
class TransactionGoalTest extends TestCase
{
    use RefreshDatabase;

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

        // Simula aporte legado: TransactionGoal sem transaction_id.
        // Usa Crypt::encryptString para casar com o EncryptedCast da model (que é como produção persistiu).
        DB::table('transaction_goal')->insert([
            'financial_goal_id' => $goal->id,
            'transaction_id'    => null,
            'amount_encrypted'  => Crypt::encryptString('300'),
            'occurred_at'       => '2026-04-01',
            'note'              => 'Aporte manual legado',
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // Instancia e executa a migration diretamente para evitar re-execução de migrations já rodadas
        $migration = require base_path('database/migrations/2026_05_16_000002_backfill_goal_virtual_accounts.php');
        $migration->up();

        // Após migração: perna outgoing — checking → virtual
        $this->assertDatabaseHas('transactions', [
            'account_id'             => $checking->id,
            'type'                   => 'transfer',
            'transfer_to_account_id' => $virtual->id,
        ]);

        // Perna incoming — registrada na conta virtual com pareamento
        $this->assertDatabaseHas('transactions', [
            'account_id' => $virtual->id,
            'type'       => 'transfer',
        ]);

        // E o saldo da meta passa a refletir o aporte migrado
        $this->assertSame(300.0, (float) $goal->fresh()->current_amount);

        // E o TransactionGoal legado foi removido
        $this->assertDatabaseMissing('transaction_goal', [
            'financial_goal_id' => $goal->id,
            'transaction_id'    => null,
        ]);
    }
}
