<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GoalDepositService
{
    public function deposit(FinancialGoal $goal, Account $source, float $amount, ?string $occurredAt = null, ?string $note = null): Transaction
    {
        // ValidationException retorna 422 com {errors: {campo: [mensagem]}} — formato que o
        // Inertia consome via flash.errors e que o frontend pode ler para destacar o campo.
        if ($source->user_id !== $goal->user_id) {
            throw ValidationException::withMessages([
                'account_id' => 'Conta de origem não pertence ao dono da meta.',
            ]);
        }

        if ($source->is_internal) {
            throw ValidationException::withMessages([
                'account_id' => 'Conta de origem não pode ser uma subconta interna.',
            ]);
        }

        if ($source->is_liability) {
            throw ValidationException::withMessages([
                'account_id' => 'Aporte a partir de conta de crédito ou financiamento não é permitido.',
            ]);
        }

        if ($amount > (float) $source->current_balance) {
            throw ValidationException::withMessages([
                'amount' => 'Saldo insuficiente na conta de origem para esse aporte.',
            ]);
        }

        $virtual = $goal->virtualAccount;
        abort_if($virtual === null, 500, 'Meta sem subconta virtual associada.');

        return DB::transaction(function () use ($source, $virtual, $amount, $occurredAt, $note) {
            $date = $occurredAt ?? now()->toDateString();

            $shared = [
                'type'             => 'transfer',
                'amount_encrypted' => $amount,
                'description'      => $note ?? 'Aporte para meta',
                'occurred_at'      => $date,
                'category'         => null,
            ];

            $outgoing = $source->transactions()->create(array_merge($shared, [
                'transfer_to_account_id' => $virtual->id,
            ]));

            $incoming = $virtual->transactions()->create(array_merge($shared, [
                'transfer_pair_id' => $outgoing->id,
            ]));

            $outgoing->update(['transfer_pair_id' => $incoming->id]);

            return $outgoing;
        });
    }
}
