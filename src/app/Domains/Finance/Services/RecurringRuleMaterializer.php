<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\RecurringRule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Varre todas as RecurringRule ativas e cria a Transaction correspondente quando:
 *  - já passou (ou é hoje) o dia efetivo do mês corrente
 *  - ainda não foi materializada nesse mês (last_run_on é de outro mês ou null)
 *  - a regra está dentro da janela [starts_on, ends_on?]
 *
 * Roda diariamente via Schedule. Idempotente — chamar duas vezes no mesmo dia
 * não duplica transações.
 */
class RecurringRuleMaterializer
{
    public function run(?Carbon $today = null): int
    {
        $today = $today ?? Carbon::today();

        $created = 0;
        RecurringRule::query()
            ->where('is_active', true)
            ->where('starts_on', '<=', $today->toDateString())
            ->where(function ($q) use ($today) {
                $q->whereNull('ends_on')->orWhere('ends_on', '>=', $today->toDateString());
            })
            ->each(function (RecurringRule $rule) use ($today, &$created) {
                if ($this->materializeIfDue($rule, $today)) {
                    $created++;
                }
            });

        return $created;
    }

    private function materializeIfDue(RecurringRule $rule, Carbon $today): bool
    {
        $due = $rule->effectiveDateForMonth($today);

        if ($due->gt($today)) {
            return false; // ainda não chegou o dia neste mês
        }

        if ($rule->last_run_on && $rule->last_run_on->isSameMonth($today)) {
            return false; // já materializou este mês
        }

        DB::transaction(function () use ($rule, $due) {
            $rule->account->transactions()->create([
                'type'             => $rule->type,
                'amount_encrypted' => (float) $rule->amount_encrypted,
                'description'      => $rule->description,
                'category'         => $rule->category,
                'occurred_at'      => $due->toDateString(),
            ]);
            $rule->update(['last_run_on' => $due->toDateString()]);
        });

        return true;
    }
}
