<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Support\Facades\DB;

class GoalDepositService
{
    public function deposit(FinancialGoal $goal, Account $source, float $amount, ?string $occurredAt = null, ?string $note = null): Transaction
    {
        if ($source->user_id !== $goal->user_id) {
            abort(422, 'Conta de origem não pertence ao dono da meta.');
        }

        if ($source->is_internal) {
            abort(422, 'Conta de origem não pode ser uma subconta interna.');
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
