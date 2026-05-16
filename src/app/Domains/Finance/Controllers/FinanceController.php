<?php

namespace App\Domains\Finance\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user();
        $now      = \Carbon\Carbon::now($user->timezone ?? 'America/Sao_Paulo');
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $monthEnd   = $now->copy()->endOfMonth()->toDateString();
        $ptMonths   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        // Contas e transações (excluindo subcontas internas de metas)
        $accounts = $user->accounts()->userVisible()->with('transactions')->get();

        // Net worth inclui subcontas internas de metas (sem elas, um aporte reduziria o patrimônio)
        $goalAccounts = $user->accounts()->internalGoalAccounts()->with('transactions')->get();
        $allAccountsForNetWorth = $accounts->concat($goalAccounts);
        $netWorth = (float) $allAccountsForNetWorth->sum(function ($a) {
            $balance = (float) $a->current_balance;
            return $a->is_liability ? -$balance : $balance;
        });

        // Transações do mês
        $allTx   = collect();
        $monthTx = collect();
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $allTx->push($t);
                $date = \Carbon\Carbon::parse($t->occurred_at)->toDateString();
                if ($date >= $monthStart && $date <= $monthEnd) $monthTx->push($t);
            }
        }

        $monthIncome  = (float) $monthTx->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
        $monthExpense = (float) $monthTx->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);
        $savingsRate  = $monthIncome > 0 ? round(($monthIncome - $monthExpense) / $monthIncome * 100, 1) : 0.0;

        // Flow chart (12 meses)
        $incomeByMonth = []; $expenseByMonth = [];
        foreach ($allTx->whereNotIn('type', ['transfer']) as $t) {
            $key    = \Carbon\Carbon::parse($t->occurred_at)->format('Y-m');
            $amount = (float) $t->amount_encrypted;
            if ($t->type === 'income') $incomeByMonth[$key] = ($incomeByMonth[$key] ?? 0) + $amount;
            else $expenseByMonth[$key] = ($expenseByMonth[$key] ?? 0) + $amount;
        }
        $flowLabels = $flowIncome = $flowExpense = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $key   = $month->format('Y-m');
            $flowLabels[]  = $ptMonths[$month->month - 1];
            $flowIncome[]  = round($incomeByMonth[$key]  ?? 0, 2);
            $flowExpense[] = round($expenseByMonth[$key] ?? 0, 2);
        }

        // Donut por tipo de conta
        $typeMap = [
            'checking'   => ['label' => 'Conta corrente', 'color' => 'var(--text-4)'],
            'savings'    => ['label' => 'Poupança',       'color' => 'var(--sky)'],
            'investment' => ['label' => 'Investimentos',  'color' => 'var(--green)'],
            'credit'     => ['label' => 'Crédito',        'color' => 'var(--rose)'],
            'loan'       => ['label' => 'Financiamento',  'color' => 'var(--amber)'],
            'cash'       => ['label' => 'Dinheiro',       'color' => 'var(--yellow)'],
        ];
        $donutGroups = [];
        foreach ($accounts as $account) {
            $type  = $account->type ?? 'checking';
            $meta  = $typeMap[$type] ?? ['label' => ucfirst($type), 'color' => 'var(--text-4)'];
            $label = $meta['label'];
            $donutGroups[$label]['label']        = $label;
            $donutGroups[$label]['color']        = $meta['color'];
            $donutGroups[$label]['is_liability'] = $account->is_liability;
            $donutGroups[$label]['amount']       = ($donutGroups[$label]['amount'] ?? 0) + (float) $account->current_balance;
        }
        $totalAssets = (float) $accounts->filter(fn($a) => !$a->is_liability)->sum('current_balance');
        $donut = array_values(array_filter(array_map(fn($g) => [
            'label'        => $g['label'],
            'color'        => $g['color'],
            'amount'       => round(abs($g['amount']), 2),
            'pct'          => $totalAssets > 0 ? (int) round(abs($g['amount']) / $totalAssets * 100) : 0,
            'is_liability' => $g['is_liability'] ?? false,
        ], $donutGroups), fn($g) => $g['amount'] != 0));

        // Orçamentos
        $budgetCategories = $user->budgetCategories()->orderBy('position')->get();
        $spendingByCategory = $monthTx->where('type', 'expense')->groupBy('category')
            ->map(fn($txs) => (float) $txs->sum(fn($t) => (float) $t->amount_encrypted));
        $budgets = $budgetCategories->map(function ($bc) use ($spendingByCategory) {
            $spent  = (float) ($spendingByCategory->get($bc->name) ?? 0);
            $budget = (float) $bc->budget_amount_encrypted;
            return [
                'id'     => $bc->id, 'name' => $bc->name, 'color' => $bc->color,
                'spent'  => $spent, 'budget' => $budget,
                'pct'    => $budget > 0 ? (int) round($spent / $budget * 100) : 0,
            ];
        })->values()->toArray();

        // Aportes manuais de metas (transaction_id IS NULL = depósito sem transação vinculada)
        $goalDeposits = $user->financialGoals()
            ->with(['transactionGoals' => fn($q) => $q->whereNull('transaction_id')])
            ->get()
            ->flatMap(fn($g) => $g->transactionGoals->map(fn($tg) => [
                'id'          => 'tg-' . $tg->id,
                'date'        => \Carbon\Carbon::parse($tg->occurred_at)->locale('pt_BR')->translatedFormat('d M'),
                'description' => 'Aporte: ' . $g->name,
                'category'    => 'Meta',
                'method'      => $tg->note ?? 'Aporte manual',
                'amount'      => (float) $tg->amount_encrypted,
                'type'        => 'goal_deposit',
                'occurred_ts' => \Carbon\Carbon::parse($tg->occurred_at)->timestamp,
            ]));

        // Transações recentes (regulares + aportes de metas, ordenadas por data)
        $recentTx = $allTx->map(fn($t) => [
                'id'          => $t->id,
                'date'        => \Carbon\Carbon::parse($t->occurred_at)->locale('pt_BR')->translatedFormat('d M'),
                'description' => $t->description,
                'category'    => $t->category ?? 'Outros',
                'method'      => optional($t->account)->name ?? '—',
                'amount'      => (float) $t->amount_encrypted,
                'type'        => $t->type,
                'occurred_ts' => \Carbon\Carbon::parse($t->occurred_at)->timestamp,
            ])
            ->concat($goalDeposits)
            ->sortByDesc('occurred_ts')
            ->take(8)
            ->map(fn($t) => collect($t)->except('occurred_ts')->all())
            ->values()->toArray();

        // Metas financeiras
        $goals = $user->financialGoals()->where('is_archived', false)
            ->with(['transactionGoals', 'virtualAccount.transactions'])
            ->get()
            ->map(fn($g) => [
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
                'deadline_label'    => $g->deadline ? ($ptMonths[$g->deadline->month - 1] . ' ' . $g->deadline->year) : null,
                'months_left'       => $g->months_left,
                'is_completed'      => $g->is_completed,
                'history'           => array_fill(0, 12, 0),
            ])->toArray();

        // NOVO: Lista de contas para o modal de lançamento
        $accountsList = $accounts->map(fn($a) => [
            'id'   => $a->id,
            'name' => $a->name,
            'type' => $a->type,
        ])->values()->toArray();

        // NOVO: Próximos pagamentos (próximos 30 dias)
        $upcomingPayments = $user->upcomingPayments()
            ->where('due_date', '>=', $now->toDateString())
            ->where('due_date', '<=', $now->copy()->addDays(30)->toDateString())
            ->orderBy('due_date')
            ->get()
            ->map(function ($p) use ($now, $ptMonths) {
                $dueDate   = \Carbon\Carbon::parse($p->due_date);
                $daysUntil = (int) $now->copy()->startOfDay()->diffInDays($dueDate->copy()->startOfDay(), false);
                return [
                    'id'          => $p->id,
                    'description' => $p->description,
                    'amount'      => (float) $p->amount_encrypted,
                    'due_date'    => $p->due_date->toDateString(),
                    'due_label'   => $dueDate->day . ' ' . $ptMonths[$dueDate->month - 1],
                    'days_until'  => $daysUntil,
                    'tag'         => $p->tag,
                    'linked_goal_id' => $p->linked_goal_id,
                ];
            })->values()->toArray();

        // NOVO: Meta de poupança do usuário
        $savingsGoalPct = $user->savings_goal_pct ?? 20;

        return \Inertia\Inertia::render('Finance/Index', [
            'net_worth'          => $netWorth,
            'month_income'       => $monthIncome,
            'month_expense'      => $monthExpense,
            'savings_rate'       => $savingsRate,
            'savings_goal_pct'   => $savingsGoalPct,
            'flow_chart'         => ['labels' => $flowLabels, 'income' => $flowIncome, 'expense' => $flowExpense],
            'donut'              => $donut,
            'budgets'            => $budgets,
            'budget_category_names' => $budgetCategories->pluck('name')->values()->toArray(),
            'transactions'       => $recentTx,
            'goals'              => $goals,
            'accounts_list'      => $accountsList,
            'upcoming_payments'  => $upcomingPayments,
            'month_label'        => $ptMonths[$now->month - 1],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate(['savings_goal_pct' => 'required|integer|min:1|max:100']);
        $request->user()->update(['savings_goal_pct' => $request->savings_goal_pct]);
        return back();
    }
}
