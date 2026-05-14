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

        // Contas e transações
        $accounts = $user->accounts()->with('transactions')->get();
        $netWorth = (float) $accounts->sum(fn($a) => $a->current_balance);

        // Transações do mês
        $allTx    = collect();
        $monthTx  = collect();
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

        // Flow chart (12 meses receita vs despesa)
        $incomeByMonth = []; $expenseByMonth = [];
        foreach ($allTx as $t) {
            $key = \Carbon\Carbon::parse($t->occurred_at)->format('Y-m');
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
        ];
        $donutGroups = [];
        foreach ($accounts as $account) {
            $type  = $account->type ?? 'checking';
            $meta  = $typeMap[$type] ?? ['label' => ucfirst($type), 'color' => 'var(--text-4)'];
            $label = $meta['label'];
            $donutGroups[$label]['label']  = $label;
            $donutGroups[$label]['color']  = $meta['color'];
            $donutGroups[$label]['amount'] = ($donutGroups[$label]['amount'] ?? 0) + (float) $account->current_balance;
        }
        $donut = $netWorth > 0 ? array_values(array_map(fn($g) => [
            'label' => $g['label'], 'color' => $g['color'],
            'amount'=> round($g['amount'], 2),
            'pct'   => (int) round($g['amount'] / $netWorth * 100),
        ], $donutGroups)) : [];

        // Orçamentos
        $budgetCategories = $user->budgetCategories()->get();
        $spendingByCategory = $monthTx->where('type', 'expense')->groupBy('category')
            ->map(fn($txs, $cat) => (float) $txs->sum(fn($t) => (float) $t->amount_encrypted));
        $budgets = $budgetCategories->map(function ($bc) use ($spendingByCategory) {
            $spent  = (float) ($spendingByCategory->get($bc->name) ?? 0);
            $budget = (float) $bc->budget_amount_encrypted;
            return [
                'id' => $bc->id, 'name' => $bc->name, 'color' => $bc->color,
                'spent' => $spent, 'budget' => $budget,
                'pct'   => $budget > 0 ? (int) round($spent / $budget * 100) : 0,
            ];
        })->values()->toArray();

        // Transações recentes
        $recentTx = $allTx->sortByDesc(fn($t) => \Carbon\Carbon::parse($t->occurred_at)->timestamp)->take(8)
            ->map(fn($t) => [
                'id'          => $t->id,
                'date'        => \Carbon\Carbon::parse($t->occurred_at)->locale('pt_BR')->translatedFormat('d M'),
                'description' => $t->description,
                'category'    => $t->category ?? 'Outros',
                'method'      => optional($t->account)->name ?? '—',
                'amount'      => (float) $t->amount_encrypted,
                'type'        => $t->type,
            ])->values()->toArray();

        // Metas financeiras com campos extras
        $goals = $user->financialGoals()->where('is_archived', false)
            ->with('transactionGoals')
            ->get()
            ->map(fn($g) => [
                'id'               => $g->id,
                'name'             => $g->name,
                'note'             => $g->note,
                'icon'             => $g->icon ?? 'Shield',
                'color'            => $g->color ?? 'var(--green)',
                'status'           => $g->status ?? 'no-prazo',
                'category'         => $g->category,
                'target_amount'    => (float) $g->target_amount_encrypted,
                'current_amount'   => $g->current_amount,
                'monthly_amount'   => $g->monthly_amount,
                'suggested_monthly'=> $g->suggested_monthly,
                'progress_percent' => $g->progress_percent,
                'deadline'         => $g->deadline ? $ptMonths[$g->deadline->month - 1] . ' ' . $g->deadline->year : null,
                'months_left'      => $g->months_left,
                'is_completed'     => $g->is_completed,
                'history'          => array_fill(0, 12, 0), // sparkline placeholder
            ])->toArray();

        return \Inertia\Inertia::render('Finance/Index', [
            'net_worth'     => $netWorth,
            'month_income'  => $monthIncome,
            'month_expense' => $monthExpense,
            'savings_rate'  => $savingsRate,
            'flow_chart'    => ['labels' => $flowLabels, 'income' => $flowIncome, 'expense' => $flowExpense],
            'donut'         => $donut,
            'budgets'       => $budgets,
            'transactions'  => $recentTx,
            'goals'         => $goals,
            'month_label'   => $ptMonths[$now->month - 1],
        ]);
    }
}
