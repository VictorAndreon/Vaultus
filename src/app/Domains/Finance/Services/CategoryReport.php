<?php

namespace App\Domains\Finance\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Transaction;
use Carbon\CarbonInterface;

/**
 * Agrega despesas por categoria no período informado. Receitas entram só no total
 * (para o usuário comparar entrada x saída). Transferências são ignoradas em ambos.
 */
class CategoryReport
{
    /**
     * @return array{categories: array<int, array{name:string,total:float,count:int,pct:int}>, total_expense: float, total_income: float}
     */
    public function generate(User $user, CarbonInterface $from, CarbonInterface $to): array
    {
        $accountIds = $user->accounts()->userVisible()->pluck('id');

        $txs = Transaction::whereIn('account_id', $accountIds)
            ->whereBetween('occurred_at', [$from->toDateString(), $to->toDateString()])
            ->whereIn('type', ['income', 'expense'])
            ->get();

        $expenses     = $txs->where('type', 'expense');
        $totalExpense = (float) round((float) $expenses->sum(fn ($t) => (float) $t->amount_encrypted), 2);
        $totalIncome  = (float) round((float) $txs->where('type', 'income')->sum(fn ($t) => (float) $t->amount_encrypted), 2);

        $categories = $expenses
            ->groupBy(fn ($t) => trim($t->category ?? '') !== '' ? $t->category : 'Outros')
            ->map(fn ($group, $name) => [
                'name'  => $name,
                'total' => round((float) $group->sum(fn ($t) => (float) $t->amount_encrypted), 2),
                'count' => $group->count(),
                'pct'   => $totalExpense > 0 ? (int) round($group->sum(fn ($t) => (float) $t->amount_encrypted) / $totalExpense * 100) : 0,
            ])
            ->sortByDesc('total')
            ->values()
            ->toArray();

        return [
            'categories'    => $categories,
            'total_expense' => $totalExpense,
            'total_income'  => $totalIncome,
        ];
    }
}
