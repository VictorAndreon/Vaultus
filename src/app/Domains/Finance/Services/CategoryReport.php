<?php

namespace App\Domains\Finance\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Transaction;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Agrega income OU expense por categoria no período. Por padrão, type='expense'.
 * Transferências sempre ignoradas. Quando `compare=true`, calcula o período
 * imediatamente anterior do mesmo tamanho e devolve delta por categoria.
 */
class CategoryReport
{
    public function generate(
        User $user,
        CarbonInterface $from,
        CarbonInterface $to,
        string $type = 'expense',
        bool $compare = false,
    ): array {
        $accountIds = $user->accounts()->userVisible()->pluck('id');

        $current = $this->slice($accountIds, $from, $to, $type);

        if (! $compare) {
            return $current;
        }

        // Comparação é "1 mês antes do mesmo intervalo". Para "maio inteiro" (01-31)
        // dá "abril inteiro" (01-30) automaticamente via subMonthNoOverflow. Em
        // ranges fora de fronteira mensal (ex: 10/abr → 09/mai), compara com
        // 10/mar → 09/abr — equivalente intuitivo de "o período anterior".
        $prevFrom = $from->copy()->subMonthNoOverflow();
        $prevTo   = $to->copy()->subMonthNoOverflow();

        $previous = $this->slice($accountIds, $prevFrom, $prevTo, $type);
        $prevByCat = collect($previous['categories'])->keyBy('name');

        $categories = collect($current['categories'])->map(function ($cat) use ($prevByCat) {
            $prev = $prevByCat->get($cat['name']);
            $previousTotal = $prev['total'] ?? 0.0;
            $delta = null;
            if ($previousTotal > 0) {
                $delta = (int) round(($cat['total'] - $previousTotal) / $previousTotal * 100);
            }
            return $cat + [
                'total_previous' => (float) $previousTotal,
                'delta_pct'      => $delta,
            ];
        })->all();

        $totalPrevious = $type === 'income' ? $previous['total_income'] : $previous['total_expense'];

        // array_merge sobrescreve `categories` com a versão enriquecida; PHP `+` preservaria
        // a original e silenciosamente perderia as colunas delta_pct/total_previous.
        return array_merge($current, [
            'categories' => $categories,
            'comparison' => [
                'from'           => $prevFrom->toDateString(),
                'to'             => $prevTo->toDateString(),
                'total_previous' => (float) $totalPrevious,
            ],
        ]);
    }

    private function slice(Collection $accountIds, CarbonInterface $from, CarbonInterface $to, string $type): array
    {
        $txs = Transaction::whereIn('account_id', $accountIds)
            ->whereBetween('occurred_at', [$from->toDateString(), $to->toDateString()])
            ->whereIn('type', ['income', 'expense'])
            ->get();

        $totalExpense = (float) round((float) $txs->where('type', 'expense')->sum(fn ($t) => (float) $t->amount_encrypted), 2);
        $totalIncome  = (float) round((float) $txs->where('type', 'income')->sum(fn ($t) => (float) $t->amount_encrypted), 2);

        $target      = $txs->where('type', $type);
        $totalTarget = $type === 'income' ? $totalIncome : $totalExpense;

        $categories = $target
            ->groupBy(fn ($t) => trim($t->category ?? '') !== '' ? $t->category : 'Outros')
            ->map(fn ($group, $name) => [
                'name'  => $name,
                'total' => round((float) $group->sum(fn ($t) => (float) $t->amount_encrypted), 2),
                'count' => $group->count(),
                'pct'   => $totalTarget > 0 ? (int) round($group->sum(fn ($t) => (float) $t->amount_encrypted) / $totalTarget * 100) : 0,
            ])
            ->sortByDesc('total')
            ->values()
            ->toArray();

        return [
            'categories'    => $categories,
            'total_expense' => $totalExpense,
            'total_income'  => $totalIncome,
            'type'          => $type,
        ];
    }
}
