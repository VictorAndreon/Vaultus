# Plano D — Refatoração Arquitetural (Backend Aggregator + Frontend Decomposition)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair o `FinanceController::index` (200+ linhas, "fat controller") para um `FinanceDashboardAggregator` em `app/Domains/Finance/Services/`, espelhando o padrão já existente em `Dashboard\Services\DashboardAggregator`; e decompor o "God Component" `Pages/Finance/Index.tsx` (1037 linhas) em componentes coesos por responsabilidade, sem alterar comportamento observável.

**Architecture:** O `FinanceDashboardAggregator` recebe um `User` e devolve um array tipado com todas as 12 seções do dashboard (net_worth, flow_chart, donut, budgets, transactions, goals, etc.). O controller passa a ter ~10 linhas. No frontend, cada modal e card vira um arquivo separado em `Pages/Finance/components/`. Charts (FlowAreaChart, DonutChart, Sparkline, GoalIcon) movem para `Pages/Finance/components/charts/`. O `Index.tsx` fica como orquestrador (~150 linhas), só importando e compondo.

**Tech Stack:** Laravel 11, React 18, TypeScript, PHPUnit

> **Dependência:** Pode rodar em paralelo a Planos A/B/C. Se Plano A ou B já foram mergeados, ajuste os pontos de extração (modal de aporte agora pede `account_id`, página `/finance/transactions` já existe — refletir nos componentes correspondentes).

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `app/Domains/Finance/Services/FinanceDashboardAggregator.php` |
| Modificar | `app/Domains/Finance/Controllers/FinanceController.php` |
| Criar | `tests/Feature/Finance/FinanceDashboardAggregatorTest.php` |
| Criar | `resources/js/Pages/Finance/components/charts/FlowAreaChart.tsx` |
| Criar | `resources/js/Pages/Finance/components/charts/DonutChart.tsx` |
| Criar | `resources/js/Pages/Finance/components/charts/Sparkline.tsx` |
| Criar | `resources/js/Pages/Finance/components/goals/GoalCard.tsx` |
| Criar | `resources/js/Pages/Finance/components/goals/GoalIconBadge.tsx` |
| Criar | `resources/js/Pages/Finance/components/goals/AporteModal.tsx` |
| Criar | `resources/js/Pages/Finance/components/goals/GoalModal.tsx` |
| Criar | `resources/js/Pages/Finance/components/accounts/AccountModal.tsx` |
| Criar | `resources/js/Pages/Finance/components/budgets/BudgetModal.tsx` |
| Criar | `resources/js/Pages/Finance/components/upcoming/UpcomingPaymentModal.tsx` |
| Criar | `resources/js/Pages/Finance/components/transactions/TransactionModal.tsx` |
| Criar | `resources/js/Pages/Finance/components/dashboard/StatGrid.tsx` |
| Criar | `resources/js/Pages/Finance/components/dashboard/RecentTransactionsCard.tsx` |
| Criar | `resources/js/lib/finance/constants.ts` |
| Criar | `resources/js/lib/finance/formatters.ts` |
| Criar | `resources/js/types/finance.ts` |
| Modificar | `resources/js/Pages/Finance/Index.tsx` |

---

## Checkpoint 1: Backend — Extrair FinanceDashboardAggregator

### Task 1: Escrever teste do aggregator (snapshot de contrato)

**Files:**
- Create: `tests/Feature/Finance/FinanceDashboardAggregatorTest.php`

- [ ] **Step 1: Criar o teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Services\FinanceDashboardAggregator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceDashboardAggregatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_aggregate_returns_all_expected_keys()
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 100000]);

        $aggregator = app(FinanceDashboardAggregator::class);
        $data = $aggregator->aggregate($user);

        foreach ([
            'net_worth', 'month_income', 'month_expense', 'savings_rate', 'savings_goal_pct',
            'flow_chart', 'donut', 'budgets', 'budget_category_names',
            'transactions', 'goals', 'accounts_list', 'upcoming_payments', 'month_label',
        ] as $key) {
            $this->assertArrayHasKey($key, $data, "Falta a chave '{$key}' no payload do aggregator");
        }
    }

    public function test_net_worth_sums_assets_minus_liabilities()
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 500000]);
        Account::factory()->create(['user_id' => $user->id, 'type' => 'credit',   'balance_encrypted' => 200000]);

        $data = app(FinanceDashboardAggregator::class)->aggregate($user);

        $this->assertSame(300000.0, (float) $data['net_worth']);
    }

    public function test_transfers_do_not_inflate_month_income_or_expense()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 500000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post("/finance/accounts/{$source->id}/transactions", [
            'type'                   => 'transfer',
            'amount_encrypted'       => 100000,
            'description'            => 'Reserva',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $data = app(FinanceDashboardAggregator::class)->aggregate($user->fresh());

        $this->assertSame(0.0, (float) $data['month_income']);
        $this->assertSame(0.0, (float) $data['month_expense']);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=FinanceDashboardAggregatorTest`
Expected: FAIL — classe `FinanceDashboardAggregator` não existe.

---

### Task 2: Criar `FinanceDashboardAggregator`

**Files:**
- Create: `app/Domains/Finance/Services/FinanceDashboardAggregator.php`

- [ ] **Step 1: Criar o serviço com toda a lógica do `index` atual**

```php
<?php

namespace App\Domains\Finance\Services;

use App\Domains\Auth\Models\User;
use Carbon\Carbon;

class FinanceDashboardAggregator
{
    private const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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

        $accounts = $user->accounts()->with('transactions')->get();
        // Se Plano A foi mergeado, trocar por: $user->accounts()->userVisible()->with('transactions')->get();

        return [
            'net_worth'             => $this->netWorth($accounts),
            ...$this->monthlyMetrics($accounts, $monthStart, $monthEnd, $now),
            'savings_goal_pct'      => $user->savings_goal_pct ?? 20,
            'flow_chart'            => $this->flowChart($accounts, $now),
            'donut'                 => $this->donut($accounts),
            'budgets'               => $this->budgets($user, $accounts, $monthStart, $monthEnd),
            'budget_category_names' => $user->budgetCategories()->pluck('name')->values()->toArray(),
            'transactions'          => $this->recentTransactions($user, $accounts),
            'goals'                 => $this->goals($user),
            'accounts_list'         => $this->accountsList($accounts),
            'upcoming_payments'     => $this->upcomingPayments($user, $now),
            'month_label'           => self::PT_MONTHS[$now->month - 1],
        ];
    }

    private function netWorth($accounts): float
    {
        return (float) $accounts->sum(fn ($a) =>
            $a->is_liability ? -((float) $a->current_balance) : (float) $a->current_balance
        );
    }

    private function monthlyMetrics($accounts, string $monthStart, string $monthEnd): array
    {
        $monthTx = collect();
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $date = Carbon::parse($t->occurred_at)->toDateString();
                if ($date >= $monthStart && $date <= $monthEnd) {
                    $monthTx->push($t);
                }
            }
        }

        $monthIncome  = (float) $monthTx->where('type', 'income')->sum(fn ($t) => (float) $t->amount_encrypted);
        $monthExpense = (float) $monthTx->where('type', 'expense')->sum(fn ($t) => (float) $t->amount_encrypted);
        $savingsRate  = $monthIncome > 0 ? round(($monthIncome - $monthExpense) / $monthIncome * 100, 1) : 0.0;

        return [
            'month_income'  => $monthIncome,
            'month_expense' => $monthExpense,
            'savings_rate'  => $savingsRate,
        ];
    }

    private function flowChart($accounts, Carbon $now): array
    {
        $incomeByMonth = [];
        $expenseByMonth = [];
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                if ($t->type === 'transfer') continue;
                $key    = Carbon::parse($t->occurred_at)->format('Y-m');
                $amount = (float) $t->amount_encrypted;
                if ($t->type === 'income') {
                    $incomeByMonth[$key] = ($incomeByMonth[$key] ?? 0) + $amount;
                } else {
                    $expenseByMonth[$key] = ($expenseByMonth[$key] ?? 0) + $amount;
                }
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

    private function donut($accounts): array
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

        $totalAssets = (float) $accounts->filter(fn ($a) => ! $a->is_liability)->sum('current_balance');

        return array_values(array_filter(array_map(fn ($g) => [
            'label'        => $g['label'],
            'color'        => $g['color'],
            'amount'       => round(abs($g['amount']), 2),
            'pct'          => $totalAssets > 0 ? (int) round(abs($g['amount']) / $totalAssets * 100) : 0,
            'is_liability' => $g['is_liability'] ?? false,
        ], $groups), fn ($g) => $g['amount'] != 0));
    }

    private function budgets(User $user, $accounts, string $monthStart, string $monthEnd): array
    {
        $monthTx = collect();
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $date = Carbon::parse($t->occurred_at)->toDateString();
                if ($date >= $monthStart && $date <= $monthEnd) $monthTx->push($t);
            }
        }

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

    private function recentTransactions(User $user, $accounts): array
    {
        $allTx = collect();
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $allTx->push($t);
            }
        }

        return $allTx->map(fn ($t) => [
                'id'          => $t->id,
                'date'        => Carbon::parse($t->occurred_at)->locale('pt_BR')->translatedFormat('d M'),
                'description' => $t->description,
                'category'    => $t->category ?? 'Outros',
                'method'      => optional($t->account)->name ?? '—',
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
            ->with('transactionGoals')
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

    private function accountsList($accounts): array
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
```

> **Nota sobre `monthlyMetrics`:** repete o loop de filtro por data porque `budgets()` também precisa. Para evitar repetir, pode-se cachear `$monthTx` em propriedade no método `aggregate()` ou usar collection compartilhada. Mantive duplicação para clareza e simplicidade nesta refatoração inicial.

---

### Task 3: Refatorar `FinanceController::index` para usar o aggregator

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Substituir o conteúdo completo do arquivo**

```php
<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Services\FinanceDashboardAggregator;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class FinanceController extends Controller
{
    public function index(Request $request, FinanceDashboardAggregator $aggregator)
    {
        return \Inertia\Inertia::render('Finance/Index', $aggregator->aggregate($request->user()));
    }

    public function updateSettings(Request $request)
    {
        $request->validate(['savings_goal_pct' => 'required|integer|min:1|max:100']);
        $request->user()->update(['savings_goal_pct' => $request->savings_goal_pct]);
        return back();
    }
}
```

- [ ] **Step 2: Rodar todos os testes de Finance**

Run: `docker compose exec app php artisan test --filter=Finance`
Expected: All PASS. Se algo falhar, o aggregator perdeu uma chave/cálculo — comparar contra o método original.

- [ ] **Step 3: Smoke test no navegador**

Run: `docker compose exec app npm run dev` e abrir `https://vaultus.local/finance` — verificar visualmente que tudo carrega como antes.

---

### Task 4: Commitar Checkpoint 1

- [ ] **Step 1: Commitar**

```bash
git add app/Domains/Finance/Services/FinanceDashboardAggregator.php \
        app/Domains/Finance/Controllers/FinanceController.php \
        tests/Feature/Finance/FinanceDashboardAggregatorTest.php
git commit -m "refactor(finance): extrair FinanceDashboardAggregator do controller"
```

---

## Checkpoint 2: Frontend — Tipos e Constantes Compartilhados

### Task 5: Criar arquivo de tipos compartilhado

**Files:**
- Create: `resources/js/types/finance.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
export interface FinancialGoal {
  id: number
  name: string
  note: string | null
  icon: string
  color: string
  status: string
  target_amount: number
  current_amount: number
  monthly_amount: number
  suggested_monthly: number
  progress_percent: number
  deadline: string | null
  deadline_label: string | null
  months_left: number
  is_completed: boolean
  history: number[]
  category: string | null
}

export interface AccountItem {
  id: number
  name: string
  type: string
}

export interface BudgetEntry {
  id: number
  name: string
  color: string
  spent: number
  budget: number
  pct: number
}

export interface FinanceTransaction {
  id: number
  date: string
  description: string
  category: string
  method: string
  amount: number
  type: 'income' | 'expense' | 'transfer' | 'goal_deposit'
}

export interface DonutSegment {
  label: string
  color: string
  amount: number
  pct: number
  is_liability?: boolean
}

export interface FlowChart {
  labels: string[]
  income: number[]
  expense: number[]
}

export interface UpcomingPayment {
  id: number
  description: string
  amount: number
  due_date: string
  due_label: string
  days_until: number
  tag: string | null
  linked_goal_id: number | null
}

export interface FinanceIndexProps {
  net_worth: number
  month_income: number
  month_expense: number
  savings_rate: number
  savings_goal_pct: number
  flow_chart: FlowChart
  donut: DonutSegment[]
  budgets: BudgetEntry[]
  transactions: FinanceTransaction[]
  goals: FinancialGoal[]
  month_label: string
  accounts_list: AccountItem[]
  upcoming_payments: UpcomingPayment[]
  budget_category_names: string[]
}
```

---

### Task 6: Criar `lib/finance/formatters.ts` e `lib/finance/constants.ts`

**Files:**
- Create: `resources/js/lib/finance/formatters.ts`
- Create: `resources/js/lib/finance/constants.ts`

- [ ] **Step 1: Criar `formatters.ts`**

```ts
export function fmtBRL(v: number, compact = false): string {
  if (compact && Math.abs(v) >= 1000) {
    return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
```

- [ ] **Step 2: Criar `constants.ts`**

```ts
export const TRANSACTION_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
  'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
  'Investimento', 'Outros',
] as const

export const GOAL_ICON_KEYS = [
  'shield', 'home', 'plane', 'car', 'graduation', 'heart', 'briefcase',
  'smartphone', 'leaf', 'coin', 'wrench', 'gamepad', 'star', 'flag',
  'trend', 'finance',
] as const

export const GOAL_COLORS = [
  { label: 'Verde',   value: 'var(--green)' },
  { label: 'Dourado', value: 'var(--gold)' },
  { label: 'Azul',    value: 'var(--sky)' },
  { label: 'Rosa',    value: 'var(--rose)' },
  { label: 'Roxo',    value: 'var(--purple, oklch(72% 0.12 290))' },
  { label: 'Teal',    value: 'var(--teal, oklch(76% 0.12 195))' },
]

export const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  'no-prazo':  { label: 'No prazo',  cls: 'tag-green' },
  'atencao':   { label: 'Atenção',   cls: 'tag-gold'  },
  'atrasado':  { label: 'Atrasado',  cls: 'tag-rose'  },
  'concluida': { label: 'Concluída', cls: 'tag-sky'   },
}

export const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Conta Corrente' },
  { value: 'savings',    label: 'Poupança' },
  { value: 'investment', label: 'Investimentos' },
  { value: 'cash',       label: 'Dinheiro' },
]

export const DEADLINE_MONTHS = [
  { v: '01', l: 'Jan' }, { v: '02', l: 'Fev' }, { v: '03', l: 'Mar' },
  { v: '04', l: 'Abr' }, { v: '05', l: 'Mai' }, { v: '06', l: 'Jun' },
  { v: '07', l: 'Jul' }, { v: '08', l: 'Ago' }, { v: '09', l: 'Set' },
  { v: '10', l: 'Out' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dez' },
]
```

---

### Task 7: Commitar Checkpoint 2

- [ ] **Step 1: Commitar**

```bash
git add resources/js/types/finance.ts \
        resources/js/lib/finance/formatters.ts \
        resources/js/lib/finance/constants.ts
git commit -m "refactor(finance): tipos e constantes compartilhados em lib/finance"
```

---

## Checkpoint 3: Extrair Charts

### Task 8: Extrair `<FlowAreaChart />`

**Files:**
- Create: `resources/js/Pages/Finance/components/charts/FlowAreaChart.tsx`

- [ ] **Step 1: Copiar a função `FlowAreaChart` de `Index.tsx` (linhas 47-106) para o novo arquivo**

```tsx
import { useState, useMemo } from 'react'
import { fmtBRL } from '@/lib/finance/formatters'

interface Props {
  income: number[]
  expense: number[]
  labels: string[]
  h?: number
}

export default function FlowAreaChart({ income, expense, labels, h = 160 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const { min, max, range, n, ptX, ptY, zoneW, w, pad } = useMemo(() => {
    const w = 600
    const pad = 24
    const allVals = [...income, ...expense]
    if (allVals.length === 0) {
      return { min: 0, max: 1, range: 1, n: 0, ptX: () => 0, ptY: () => 0, zoneW: 0, w, pad }
    }
    const min = Math.min(...allVals) * 0.9
    const max = Math.max(...allVals) * 1.1 || 1
    const range = max - min || 1
    const n = labels.length
    const ptX = (i: number) => pad + (n > 1 ? (i / (n - 1)) : 0.5) * (w - pad * 2)
    const ptY = (v: number) => h - 24 - ((v - min) / range) * (h - 48)
    const zoneW = n > 1 ? (w - pad * 2) / (n - 1) : w - pad * 2
    return { min, max, range, n, ptX, ptY, zoneW, w, pad }
  }, [income, expense, labels, h])

  if (n === 0) return null

  const toLine = (data: number[]) =>
    data.map((v, i) => `${i ? 'L' : 'M'}${ptX(i).toFixed(1)},${ptY(v).toFixed(1)}`).join(' ')

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1={pad} x2={w - pad} y1={24 + i * ((h - 48) / 3)} y2={24 + i * ((h - 48) / 3)}
            stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
        ))}
        <path d={toLine(income)} fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toLine(expense)} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />
        {labels.map((l, i) => (
          <text key={i} x={ptX(i)} y={h - 6} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
        ))}
        {hovered !== null && (
          <>
            <line x1={ptX(hovered)} x2={ptX(hovered)} y1={20} y2={h - 24} stroke="var(--line)" strokeWidth={1} />
            <circle cx={ptX(hovered)} cy={ptY(income[hovered])} r={3.5} fill="var(--green)" />
            <circle cx={ptX(hovered)} cy={ptY(expense[hovered])} r={3.5} fill="var(--gold)" />
          </>
        )}
        {labels.map((_, i) => (
          <rect key={i} x={ptX(i) - zoneW / 2} y={0} width={zoneW} height={h - 12}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        ))}
      </svg>
      {hovered !== null && (() => {
        const net = income[hovered] - expense[hovered]
        const leftPct = (ptX(hovered) / w * 100).toFixed(1)
        return (
          <div style={{
            position: 'absolute', top: 4, left: `${leftPct}%`,
            transform: hovered < n / 2 ? 'translateX(8px)' : 'translateX(calc(-100% - 8px))',
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            borderRadius: 8, padding: '8px 12px', fontSize: 11,
            fontFamily: 'var(--mono)', pointerEvents: 'none', zIndex: 10,
            whiteSpace: 'nowrap', boxShadow: 'var(--shadow-2)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{labels[hovered]}</div>
            <div style={{ color: 'var(--green)', marginBottom: 2 }}>↑ {fmtBRL(income[hovered])}</div>
            <div style={{ color: 'var(--gold)', marginBottom: 5 }}>↓ {fmtBRL(expense[hovered])}</div>
            <div style={{ color: net >= 0 ? 'var(--green)' : 'var(--rose)', borderTop: '1px solid var(--line-soft)', paddingTop: 4 }}>
              {net >= 0 ? '+' : ''}{fmtBRL(net)}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
```

---

### Task 9: Extrair `<DonutChart />` e `<Sparkline />`

**Files:**
- Create: `resources/js/Pages/Finance/components/charts/DonutChart.tsx`
- Create: `resources/js/Pages/Finance/components/charts/Sparkline.tsx`

- [ ] **Step 1: Criar `DonutChart.tsx`** copiando da função em `Index.tsx:108-138`

```tsx
import { DonutSegment } from '@/types/finance'

interface Props {
  segments: DonutSegment[]
  center: { label: string; value: string }
}

export default function DonutChart({ segments, center }: Props) {
  const r = 60
  const c = 2 * Math.PI * r
  let acc = 0
  const total = segments.reduce((s, x) => s + x.pct, 0) || 100

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width="160" height="160" viewBox="-80 -80 160 160" style={{ transform: 'rotate(-90deg)', flex: 'none' }}>
        <circle r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
        {segments.map((s, i) => {
          const len = (s.pct / total) * c
          const off = c - acc
          acc += len
          return (
            <circle key={i} r={r} fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`}
              strokeDashoffset={off.toFixed(2)} />
          )
        })}
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="kicker">{center.label}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--text)', marginTop: 2 }}>{center.value}</div>
        </div>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flex: 'none' }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <span className="mono muted">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `Sparkline.tsx`** copiando da função em `Index.tsx:140-145`

```tsx
interface Props {
  data: number[]
  color?: string
  w?: number
  h?: number
}

export default function Sparkline({ data, color = 'var(--green)', w = 140, h = 28 }: Props) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(1)}`
  ).join(' ')

  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

---

### Task 10: Commitar Checkpoint 3

- [ ] **Step 1: Commitar**

```bash
git add resources/js/Pages/Finance/components/charts/
git commit -m "refactor(finance): extrair FlowAreaChart, DonutChart e Sparkline para components/charts"
```

---

## Checkpoint 4: Extrair Goals

### Task 11: Extrair `<GoalIconBadge />` e `<GoalCard />`

**Files:**
- Create: `resources/js/Pages/Finance/components/goals/GoalIconBadge.tsx`
- Create: `resources/js/Pages/Finance/components/goals/GoalCard.tsx`

- [ ] **Step 1: Criar `GoalIconBadge.tsx`** copiando de `Index.tsx:147-188`

```tsx
import { Icons } from '@/Components/Icons'

const GOAL_ICON_MAP: Record<string, (p: { size?: number; strokeWidth?: number }) => JSX.Element> = {
  shield: Icons.Shield, home: Icons.Home, plane: Icons.Plane, car: Icons.Car,
  graduation: Icons.GraduationCap, heart: Icons.Heart, briefcase: Icons.Briefcase,
  smartphone: Icons.Smartphone, leaf: Icons.Leaf, coin: Icons.Coin,
  wrench: Icons.Wrench, gamepad: Icons.GamePad, star: Icons.Star,
  flag: Icons.Flag, trend: Icons.Trend, finance: Icons.Finance,
}

interface Props {
  iconKey: string
  color: string
  size?: number
}

export default function GoalIconBadge({ iconKey, color, size = 44 }: Props) {
  const Comp = GOAL_ICON_MAP[iconKey] ?? Icons.Shield
  return (
    <div style={{
      width: size, height: size,
      borderRadius: Math.round(size * 0.28),
      background: `color-mix(in oklab, ${color} 16%, var(--surface-2))`,
      border: `1px solid color-mix(in oklab, ${color} 32%, transparent)`,
      color: color,
      display: 'grid', placeItems: 'center',
      flexShrink: 0,
    }}>
      <Comp size={Math.round(size * 0.46)} strokeWidth={1.5} />
    </div>
  )
}
```

- [ ] **Step 2: Criar `GoalCard.tsx`** copiando de `Index.tsx:198-294`

```tsx
import { useState } from 'react'
import { Icons } from '@/Components/Icons'
import { FinancialGoal } from '@/types/finance'
import { STATUS_MAP } from '@/lib/finance/constants'
import { fmtBRL } from '@/lib/finance/formatters'
import GoalIconBadge from './GoalIconBadge'
import Sparkline from '../charts/Sparkline'

interface Props {
  g: FinancialGoal
  onAporte: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function GoalCard({ g, onAporte, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
  const remaining = g.target_amount - g.current_amount
  const monthsToFinish = g.monthly_amount > 0 ? Math.ceil(remaining / g.monthly_amount) : null
  const status = STATUS_MAP[g.status] ?? STATUS_MAP['no-prazo']
  const isOnPlan = g.monthly_amount >= g.suggested_monthly || g.suggested_monthly === 0

  return (
    <div className="card" style={{ padding: 22, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <GoalIconBadge iconKey={g.icon} color={g.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{g.name}</span>
            <span className={`tag ${status.cls}`}><span className="dot" />{status.label}</span>
          </div>
          {g.note && <div className="muted" style={{ fontSize: 12 }}>{g.note}</div>}
        </div>
        <div style={{ position: 'relative', flex: 'none' }}>
          <button className="icon-btn" style={{ width: 28, height: 28, fontSize: 14, letterSpacing: 1 }}
            onClick={() => setMenuOpen(o => !o)}>···</button>
          {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 34, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', zIndex: 20, minWidth: 110, boxShadow: 'var(--shadow-2)' }}>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start', padding: '9px 14px' }}
                onClick={() => { setMenuOpen(false); onEdit() }}>
                <Icons.Edit size={12} /> Editar
              </button>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start', padding: '9px 14px', color: 'var(--rose)' }}
                onClick={() => { setMenuOpen(false); onDelete() }}>
                <Icons.Trash size={12} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmtBRL(g.current_amount)}</div>
        <div className="mono muted" style={{ fontSize: 13 }}>de {fmtBRL(g.target_amount)}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="meter" style={{ flex: 1, height: 5 }}><span style={{ width: pct + '%', background: g.color }} /></div>
        <span className="mono" style={{ fontSize: 13, color: g.color, fontWeight: 500 }}>{pct}%</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, paddingTop: 14, paddingBottom: 14, borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', marginBottom: 14 }}>
        <div>
          <div className="kicker" style={{ fontSize: 9.5 }}>Aporte mensal</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{fmtBRL(g.monthly_amount)}</div>
          <div style={{ fontSize: 10.5, marginTop: 2, color: isOnPlan ? 'var(--green)' : 'var(--gold)' }}>
            {isOnPlan ? 'no plano' : `↑ ideal ${fmtBRL(g.suggested_monthly)}`}
          </div>
        </div>
        <div>
          <div className="kicker" style={{ fontSize: 9.5 }}>Falta</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{fmtBRL(remaining, true)}</div>
          {monthsToFinish && <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{monthsToFinish} meses no ritmo</div>}
        </div>
        <div>
          <div className="kicker" style={{ fontSize: 9.5 }}>Prazo</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{g.deadline_label ?? '—'}</div>
          {g.months_left > 0 && <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{g.months_left} meses restantes</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="kicker" style={{ fontSize: 9.5, marginBottom: 6 }}>Evolução · 12 meses</div>
          <Sparkline data={g.history.length > 1 ? g.history : [0, g.current_amount / 1000]} color={g.color} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Editar meta" onClick={onEdit}>
            <Icons.Edit size={13} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={onAporte}>
            <Icons.Plus size={12} /> Aportar
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 12: Extrair `<AporteModal />` e `<GoalModal />`

**Files:**
- Create: `resources/js/Pages/Finance/components/goals/AporteModal.tsx`
- Create: `resources/js/Pages/Finance/components/goals/GoalModal.tsx`

- [ ] **Step 1: Copiar `AporteModal` de `Index.tsx:296-317`**

> Se Plano A já foi mergeado, copiar a versão com seletor de conta (do Plano A Task 16). Senão, copiar a versão atual.

- [ ] **Step 2: Copiar `GoalModal` de `Index.tsx:326-440`**

Importar dependências de `@/lib/finance/constants` e `@/types/finance` em vez de definir inline.

> Para evitar duplicação, este step não cola o código todo — confiar no arquivo atual `Index.tsx` como source. **Antes de executar**, abrir as linhas indicadas e colar como novo arquivo, ajustando imports.

---

### Task 13: Commitar Checkpoint 4

- [ ] **Step 1: Commitar**

```bash
git add resources/js/Pages/Finance/components/goals/
git commit -m "refactor(finance): extrair GoalCard, GoalIconBadge, AporteModal e GoalModal"
```

---

## Checkpoint 5: Extrair Demais Modais e Index Final

### Task 14: Extrair `<AccountModal />`, `<BudgetModal />`, `<UpcomingPaymentModal />`, `<TransactionModal />`

**Files:**
- Create: `resources/js/Pages/Finance/components/accounts/AccountModal.tsx`
- Create: `resources/js/Pages/Finance/components/budgets/BudgetModal.tsx`
- Create: `resources/js/Pages/Finance/components/upcoming/UpcomingPaymentModal.tsx`
- Create: `resources/js/Pages/Finance/components/transactions/TransactionModal.tsx`

- [ ] **Step 1: Para cada modal, copiar da função interna em `Index.tsx` para arquivo próprio**

| Modal | Linhas em Index.tsx (aproximadas) |
|---|---|
| AccountModal | 449-510 |
| BudgetModal | ~511-600 |
| UpcomingPaymentModal | ~600-700 |
| TransactionModal | ~700-740 |

> Estes ranges são aproximados — verificar antes via grep. **Abrir o arquivo, encontrar a função, copiar para o novo path, ajustar imports.**

- [ ] **Step 2: Garantir que cada componente importa de `@/lib/finance/*` e `@/types/finance`**

---

### Task 15: Reescrever `Index.tsx` como orquestrador

**Files:**
- Modify: `resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Substituir o conteúdo completo do arquivo por orquestração**

```tsx
import { useState, useMemo } from 'react'
import { router, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'

// Tipos
import { FinanceIndexProps, FinancialGoal } from '@/types/finance'

// Utils
import { fmtBRL } from '@/lib/finance/formatters'

// Charts
import FlowAreaChart from './components/charts/FlowAreaChart'
import DonutChart from './components/charts/DonutChart'

// Cards/Modais
import GoalCard from './components/goals/GoalCard'
import GoalModal from './components/goals/GoalModal'
import AporteModal from './components/goals/AporteModal'
import AccountModal from './components/accounts/AccountModal'
import BudgetModal from './components/budgets/BudgetModal'
import UpcomingPaymentModal from './components/upcoming/UpcomingPaymentModal'
import TransactionModal from './components/transactions/TransactionModal'

export default function FinanceIndex({
  net_worth, month_income, month_expense, savings_rate, savings_goal_pct,
  flow_chart, donut, budgets, transactions, goals, month_label,
  accounts_list, upcoming_payments, budget_category_names,
}: FinanceIndexProps) {
  const [aporteGoal, setAporteGoal] = useState<FinancialGoal | null>(null)
  const [goalModal, setGoalModal] = useState<{ goal: FinancialGoal | null } | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTxModal, setShowTxModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [upcomingModal, setUpcomingModal] = useState<{ payment: any } | null>(null)

  const totalMonthly = useMemo(() => goals.reduce((s, g) => s + g.monthly_amount, 0), [goals])

  function handleAporte({ amount, accountId }: { amount: number; accountId?: number }) {
    if (!aporteGoal) return
    router.post(`/finance/goals/${aporteGoal.id}/deposit`,
      { amount, account_id: accountId },
      { preserveScroll: true, onSuccess: () => setAporteGoal(null) }
    )
  }

  return (
    <AppLayout title="Finanças" eyebrow="Patrimônio" subtitle="Saldo, fluxo, orçamento e metas.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Stat grid */}
        <div className="grid-3" style={{ gap: 12 }}>
          {[
            { label: 'Patrimônio Líquido', value: fmtBRL(net_worth), sub: 'acumulado', dir: 'up' },
            { label: `Receitas · ${month_label}`, value: fmtBRL(month_income), sub: 'este mês', dir: 'up' },
            { label: `Despesas · ${month_label}`, value: fmtBRL(month_expense), sub: 'este mês', dir: 'flat' },
          ].map((s, i) => (
            <div key={i} className="card stat" style={{ padding: 22 }}>
              <div className="kicker">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
              <div className={`stat-delta ${s.dir}`} style={{ marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
          <div className="card stat" style={{ padding: 22 }}>
            <div className="kicker">Taxa de poupança</div>
            <div className="stat-value" style={{ fontSize: 28 }}>{savings_rate.toLocaleString('pt-BR')}%</div>
            <div className={`stat-delta ${savings_rate >= savings_goal_pct ? 'up' : 'flat'}`}
                 style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {savings_rate >= savings_goal_pct && <Icons.ArrowUpRight size={11} />}
              meta {savings_goal_pct}%
            </div>
          </div>
        </div>

        {/* Charts row */}
        <section className="grid-2" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="card-title">Fluxo · 12 meses</div>
            <FlowAreaChart {...flow_chart} />
          </div>
          <div className="card" style={{ padding: 22 }}>
            <div className="card-title">Distribuição patrimonial</div>
            {donut.length > 0
              ? <DonutChart segments={donut} center={{ label: 'Total', value: fmtBRL(net_worth, true) }} />
              : <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Sem contas cadastradas.</div>}
          </div>
        </section>

        {/* Goals */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title">Metas</div>
            <span>Aporte mensal <b className="mono" style={{ color: 'var(--green)' }}>{fmtBRL(totalMonthly)}</b></span>
            <button className="btn btn-primary btn-sm" onClick={() => setGoalModal({ goal: null })}>
              <Icons.Plus size={12} /> Nova meta
            </button>
          </div>
          <div className="grid-3" style={{ gap: 16 }}>
            {goals.map(g => (
              <GoalCard
                key={g.id}
                g={g}
                onAporte={() => setAporteGoal(g)}
                onEdit={() => setGoalModal({ goal: g })}
                onDelete={() => {
                  if (confirm('Excluir esta meta?')) router.delete(`/finance/goals/${g.id}`, { preserveScroll: true })
                }}
              />
            ))}
          </div>
        </section>

        {/* Tabela de lançamentos (teaser) */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Lançamentos recentes</div>
            <Link href="/finance/transactions" className="btn btn-ghost btn-sm">Ver tudo →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 140px 180px 120px', padding: '10px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
            <div>Data</div><div>Descrição</div><div>Categoria</div><div>Método</div><div style={{ textAlign: 'right' }}>Valor</div>
          </div>
          {transactions.length === 0
            ? <div style={{ padding: 24, color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum lançamento.</div>
            : transactions.map((t, i) => {
                const sign  = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔'
                const color = t.type === 'income' ? 'var(--success)' : t.type === 'expense' ? 'var(--rose)' : 'var(--text-3)'
                return (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 140px 180px 120px', padding: '12px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13 }}>
                    <div className="mono muted" style={{ fontSize: 11 }}>{t.date}</div>
                    <div>{t.description}</div>
                    <div className="muted">{t.category}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{t.method}</div>
                    <div className="mono" style={{ textAlign: 'right', color, fontWeight: 500 }}>
                      {sign} {fmtBRL(Math.abs(t.amount))}
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* Modais */}
      {goalModal !== null && <GoalModal goal={goalModal.goal} onClose={() => setGoalModal(null)} />}
      {aporteGoal && <AporteModal goal={aporteGoal} accounts={accounts_list} onClose={() => setAporteGoal(null)} onSave={handleAporte} />}
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} />}
      {showTxModal && <TransactionModal accounts={accounts_list} budgetCategories={budget_category_names} onClose={() => setShowTxModal(false)} />}
      {showBudgetModal && <BudgetModal budgets={budgets} onClose={() => setShowBudgetModal(false)} />}
      {upcomingModal !== null && <UpcomingPaymentModal payment={upcomingModal.payment} goals={goals} onClose={() => setUpcomingModal(null)} />}
    </AppLayout>
  )
}
```

- [ ] **Step 2: Confirmar contagem de linhas**

Run: `wc -l /home/andreon/Documentos/Vaultus/src/resources/js/Pages/Finance/Index.tsx`
Expected: <250 linhas.

---

### Task 16: Smoke test completo + commit

- [ ] **Step 1: Rodar dev server e abrir o app**

Run: `docker compose exec app npm run dev`
Abrir `https://vaultus.local/finance` e confirmar:
- (a) Todos os cards aparecem com os mesmos números.
- (b) Charts (flow, donut) renderizam corretamente.
- (c) Modais abrem e fecham normalmente.
- (d) Aportar, criar conta, criar transação, criar meta — todos funcionam.

- [ ] **Step 2: Commitar**

```bash
git add resources/js/Pages/Finance/Index.tsx \
        resources/js/Pages/Finance/components/accounts/ \
        resources/js/Pages/Finance/components/budgets/ \
        resources/js/Pages/Finance/components/upcoming/ \
        resources/js/Pages/Finance/components/transactions/
git commit -m "refactor(finance): Index.tsx vira orquestrador (1037 → ~250 linhas)"
```

---

## Critérios de Conclusão

- [ ] `Index.tsx` tem menos de 300 linhas.
- [ ] `FinanceController::index` tem menos de 15 linhas.
- [ ] `FinanceDashboardAggregatorTest` passa.
- [ ] Nenhuma regressão visual no dashboard (smoke test).
- [ ] Cada componente extraído pode ser importado independentemente.

## Riscos & Mitigações

| Risco | Mitigação |
|-------|-----------|
| Imports circulares entre `goals/` e `charts/` | Estrutura unidirecional: `goals/GoalCard` importa de `charts/Sparkline`, nunca o contrário. |
| Perder lógica sutil ao extrair (ex: condicional escondido) | Ler arquivo original linha por linha, comparar com extração; smoke test cobre regressão visível. |
| Pasta `components/` explodir em arquivos | Mantém organização por subdomínio (goals/, accounts/, charts/). Cada pasta com 2-3 arquivos no máximo. |
| Conflito de merge se Plano A/B mexem em `Index.tsx` simultaneamente | Mergear este Plano D ANTES ou DEPOIS de A/B, não em paralelo. |
