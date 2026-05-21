<?php

namespace App\Domains\Finance\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\InstallmentPlan;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cria um InstallmentPlan e materializa N transações (uma por mês) vinculadas a ele.
 * Cada parcela = total / N (arredondada a 2 casas); a última recebe o resíduo do
 * arredondamento para que a soma feche exatamente o total.
 *
 * Por convenção, o limite do cartão é consumido pelo total da compra (e não só pela
 * parcela atual), seguindo o comportamento de cartões reais no Brasil.
 */
class InstallmentPlanCreator
{
    public function create(User $user, array $data): InstallmentPlan
    {
        /** @var Account $account */
        $account = Account::findOrFail($data['account_id']);

        if ($account->user_id !== $user->id) {
            throw ValidationException::withMessages(['account_id' => 'Conta não pertence ao usuário.']);
        }
        if ($account->type !== 'credit') {
            throw ValidationException::withMessages(['account_id' => 'Parcelamento só é permitido em cartões de crédito.']);
        }

        $total = (float) $data['total_amount'];
        $n     = (int) $data['installments'];

        $limit = $account->credit_limit_encrypted !== null ? (float) $account->credit_limit_encrypted : null;
        if ($limit !== null && (float) $account->current_balance + $total > $limit) {
            throw ValidationException::withMessages([
                'total_amount' => 'Compra ultrapassa o limite disponível do cartão.',
            ]);
        }

        return DB::transaction(function () use ($user, $account, $data, $total, $n) {
            $plan = $user->installmentPlans()->create([
                'account_id'             => $account->id,
                'description'            => $data['description'],
                'total_amount_encrypted' => $total,
                'installments'           => $n,
                'first_due_on'           => $data['first_due_on'],
                'category'               => $data['category'] ?? null,
            ]);

            $base       = round($total / $n, 2);
            $accumBase  = round($base * $n, 2);
            $remainder  = round($total - $accumBase, 2);
            $firstDue   = Carbon::parse($data['first_due_on']);

            for ($i = 1; $i <= $n; $i++) {
                $amount = $i === $n ? round($base + $remainder, 2) : $base;
                $occurredAt = $firstDue->copy()->addMonthsNoOverflow($i - 1);

                $account->transactions()->create([
                    'type'                => 'expense',
                    'amount_encrypted'    => $amount,
                    'description'         => $data['description'] . " ({$i}/{$n})",
                    'category'            => $data['category'] ?? null,
                    'occurred_at'         => $occurredAt->toDateString(),
                    'installment_plan_id' => $plan->id,
                    'installment_number'  => $i,
                ]);
            }

            return $plan;
        });
    }
}
