<?php

namespace App\Domains\Finance\Services;

use App\Domains\Auth\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

/**
 * Agrega todos os dados do dashboard de finanças (~14 chaves) para o Inertia render.
 *
 * O método público é {@see aggregate()}; cada método privado encapsula uma seção
 * (net worth, fluxo, donut, metas, etc) para facilitar leitura, testes e mudança
 * isolada. Reproduz fielmente a lógica que vivia em FinanceController::index.
 */
class FinanceDashboardAggregator
{
    /** @var string[] */
    private const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    /** @var array<string, array{label: string, color: string}> */
    private const TYPE_MAP = [
        'checking'   => ['label' => 'Conta corrente', 'color' => 'var(--text-4)'],
        'savings'    => ['label' => 'Poupança',       'color' => 'var(--sky)'],
        'investment' => ['label' => 'Investimentos',  'color' => 'var(--green)'],
        'credit'     => ['label' => 'Crédito',        'color' => 'var(--rose)'],
        'loan'       => ['label' => 'Financiamento',  'color' => 'var(--amber)'],
        'cash'       => ['label' => 'Dinheiro',       'color' => 'var(--yellow)'],
    ];

    public function aggregate(User $user): array
    {
        $now        = Carbon::now($user->timezone ?? 'America/Sao_Paulo');
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $monthEnd   = $now->copy()->endOfMonth()->toDateString();

        // Contas visíveis (oculta subcontas internas de metas)
        $accounts = $user->accounts()->userVisible()->with('transactions')->get();
        // Subcontas internas entram apenas no net worth — sem elas, um aporte reduziria o patrimônio.
        $goalAccounts = $user->accounts()->internalGoalAccounts()->with('transactions')->get();

        [$allTx, $monthTx] = $this->splitTransactions($accounts, $monthStart, $monthEnd);

        return [
            'net_worth'             => $this->netWorth($accounts->concat($goalAccounts)),
            'month_income'          => $this->sumByType($monthTx, 'income'),
            'month_expense'         => $this->sumByType($monthTx, 'expense'),
            'savings_rate'          => $this->savingsRate($monthTx),
            'savings_goal_pct'      => $user->savings_goal_pct ?? 20,
            'flow_chart'            => $this->flowChart($allTx, $now),
            'donut'                 => $this->donut($accounts),
            'budgets'               => $this->budgets($user, $monthTx),
            'budget_category_names' => $user->budgetCategories()->pluck('name')->values()->toArray(),
            'transactions'          => $this->recentTransactions($allTx),
            'goals'                 => $this->goals($user),
            'accounts_list'         => $this->accountsList($accounts),
            'upcoming_payments'     => $this->upcomingPayments($user, $now),
            'wishlist'              => $this->wishlist($user),
            'month_label'           => self::PT_MONTHS[$now->month - 1],
        ];
    }

    private function wishlist(User $user): array
    {
        return $user->wishlistItems()->with('goal')->orderByDesc('id')->get()
            ->map(fn ($w) => [
                'id'                => $w->id,
                'name'              => $w->name,
                'estimated_price'   => $w->estimated_price_encrypted !== null ? (float) $w->estimated_price_encrypted : null,
                'priority'          => $w->priority,
                'url'               => $w->url,
                'notes'             => $w->notes,
                'financial_goal_id' => $w->financial_goal_id,
                'goal_name'         => $w->goal?->name,
            ])->values()->toArray();
    }

    /**
     * @return array{0: \Illuminate\Support\Collection, 1: \Illuminate\Support\Collection}
     */
    private function splitTransactions(Collection $accounts, string $monthStart, string $monthEnd): array
    {
        $allTx   = collect();
        $monthTx = collect();
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $allTx->push($t);
                $date = Carbon::parse($t->occurred_at)->toDateString();
                if ($date >= $monthStart && $date <= $monthEnd) {
                    $monthTx->push($t);
                }
            }
        }
        return [$allTx, $monthTx];
    }

    private function netWorth(Collection $accounts): float
    {
        return (float) $accounts->sum(function ($a) {
            $balance = (float) $a->current_balance;
            return $a->is_liability ? -$balance : $balance;
        });
    }

    private function sumByType(\Illuminate\Support\Collection $monthTx, string $type): float
    {
        return (float) $monthTx->where('type', $type)->sum(fn ($t) => (float) $t->amount_encrypted);
    }

    private function savingsRate(\Illuminate\Support\Collection $monthTx): float
    {
        $income  = $this->sumByType($monthTx, 'income');
        $expense = $this->sumByType($monthTx, 'expense');
        return $income > 0 ? round(($income - $expense) / $income * 100, 1) : 0.0;
    }

    private function flowChart(\Illuminate\Support\Collection $allTx, Carbon $now): array
    {
        $incomeByMonth = [];
        $expenseByMonth = [];
        foreach ($allTx->whereNotIn('type', ['transfer']) as $t) {
            $key    = Carbon::parse($t->occurred_at)->format('Y-m');
            $amount = (float) $t->amount_encrypted;
            if ($t->type === 'income') {
                $incomeByMonth[$key] = ($incomeByMonth[$key] ?? 0) + $amount;
            } else {
                $expenseByMonth[$key] = ($expenseByMonth[$key] ?? 0) + $amount;
            }
        }

        $labels = $income = $expense = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $key   = $month->format('Y-m');
            $labels[]  = self::PT_MONTHS[$month->month - 1];
            $income[]  = round($incomeByMonth[$key]  ?? 0, 2);
            $expense[] = round($expenseByMonth[$key] ?? 0, 2);
        }

        return ['labels' => $labels, 'income' => $income, 'expense' => $expense];
    }

    private function donut(Collection $accounts): array
    {
        $groups = [];
        foreach ($accounts as $account) {
            $type  = $account->type ?? 'checking';
            $meta  = self::TYPE_MAP[$type] ?? ['label' => ucfirst($type), 'color' => 'var(--text-4)'];
            $label = $meta['label'];
            $groups[$label]['label']        = $label;
            $groups[$label]['color']        = $meta['color'];
            $groups[$label]['is_liability'] = $account->is_liability;
            $groups[$label]['amount']       = ($groups[$label]['amount'] ?? 0) + (float) $account->current_balance;
        }

        // Denominador = soma apenas dos ativos com saldo positivo. Saldo negativo de ativo
        // (ex: corrente estourada) é uma anomalia que não compõe "alocação de patrimônio";
        // incluí-lo distorce o pct de todas as outras fatias.
        $totalAssets = (float) $accounts
            ->filter(fn ($a) => ! $a->is_liability && (float) $a->current_balance > 0)
            ->sum('current_balance');

        return array_values(array_filter(array_map(fn ($g) => [
            'label'        => $g['label'],
            'color'        => $g['color'],
            'amount'       => round(abs($g['amount']), 2),
            'pct'          => $totalAssets > 0 ? (int) round(abs($g['amount']) / $totalAssets * 100) : 0,
            'is_liability' => $g['is_liability'] ?? false,
        ], $groups), fn ($g) => $g['amount'] > 0));
    }

    private function budgets(User $user, \Illuminate\Support\Collection $monthTx): array
    {
        $spendingByCategory = $monthTx->where('type', 'expense')
            ->groupBy('category')
            ->map(fn ($txs) => (float) $txs->sum(fn ($t) => (float) $t->amount_encrypted));

        return $user->budgetCategories()->orderBy('position')->get()->map(function ($bc) use ($spendingByCategory) {
            $spent  = (float) ($spendingByCategory->get($bc->name) ?? 0);
            $budget = (float) $bc->budget_amount_encrypted;
            return [
                'id'     => $bc->id,
                'name'   => $bc->name,
                'color'  => $bc->color,
                'spent'  => $spent,
                'budget' => $budget,
                'pct'    => $budget > 0 ? (int) round($spent / $budget * 100) : 0,
            ];
        })->values()->toArray();
    }

    private function recentTransactions(\Illuminate\Support\Collection $allTx): array
    {
        // Transferências são pares (outgoing + incoming). Mantemos só a perna outgoing —
        // que carrega transfer_to_account_id — para o usuário ver uma única linha por evento.
        return $allTx
            ->reject(fn ($t) => $t->type === 'transfer' && is_null($t->transfer_to_account_id))
            ->map(fn ($t) => [
                'id'          => $t->id,
                'account_id'  => $t->account_id,
                'date'        => Carbon::parse($t->occurred_at)->locale('pt_BR')->translatedFormat('d M'),
                'occurred_at' => Carbon::parse($t->occurred_at)->toDateString(),
                'description' => $t->description,
                'category'    => $t->category ?? 'Outros',
                'method'      => $t->type === 'transfer'
                    ? (optional($t->account)->name ?? '—') . ' → ' . (optional($t->transferDestination)->name ?? '—')
                    : (optional($t->account)->name ?? '—'),
                'amount'      => (float) $t->amount_encrypted,
                'type'        => $t->type,
                'occurred_ts' => Carbon::parse($t->occurred_at)->timestamp,
            ])
            ->sortByDesc('occurred_ts')
            ->take(8)
            ->map(fn ($t) => collect($t)->except('occurred_ts')->all())
            ->values()->toArray();
    }

    private function goals(User $user): array
    {
        return $user->financialGoals()->where('is_archived', false)
            ->with(['transactionGoals', 'virtualAccount.transactions'])
            ->get()
            ->map(fn ($g) => [
                'id'                => $g->id,
                'name'              => $g->name,
                'note'              => $g->note,
                'icon'              => $g->icon ?? 'Shield',
                'color'             => $g->color ?? 'var(--green)',
                'status'            => $g->status ?? 'no-prazo',
                'category'          => $g->category,
                'target_amount'     => (float) $g->target_amount_encrypted,
                'current_amount'    => $g->current_amount,
                'monthly_amount'    => $g->monthly_amount,
                'suggested_monthly' => $g->suggested_monthly,
                'progress_percent'  => $g->progress_percent,
                'deadline'          => $g->deadline ? $g->deadline->format('Y-m') : null,
                'deadline_label'    => $g->deadline ? (self::PT_MONTHS[$g->deadline->month - 1] . ' ' . $g->deadline->year) : null,
                'months_left'       => $g->months_left,
                'is_completed'      => $g->is_completed,
                'history'           => array_fill(0, 12, 0),
            ])->toArray();
    }

    private function accountsList(Collection $accounts): array
    {
        return $accounts->map(fn ($a) => [
            'id'   => $a->id,
            'name' => $a->name,
            'type' => $a->type,
        ])->values()->toArray();
    }

    private function upcomingPayments(User $user, Carbon $now): array
    {
        return $user->upcomingPayments()
            ->where('due_date', '>=', $now->toDateString())
            ->where('due_date', '<=', $now->copy()->addDays(30)->toDateString())
            ->orderBy('due_date')
            ->get()
            ->map(function ($p) use ($now) {
                $dueDate   = Carbon::parse($p->due_date);
                $daysUntil = (int) $now->copy()->startOfDay()->diffInDays($dueDate->copy()->startOfDay(), false);
                return [
                    'id'             => $p->id,
                    'description'    => $p->description,
                    'amount'         => (float) $p->amount_encrypted,
                    'due_date'       => $p->due_date->toDateString(),
                    'due_label'      => $dueDate->day . ' ' . self::PT_MONTHS[$dueDate->month - 1],
                    'days_until'     => $daysUntil,
                    'tag'            => $p->tag,
                    'linked_goal_id' => $p->linked_goal_id,
                ];
            })->values()->toArray();
    }
}
