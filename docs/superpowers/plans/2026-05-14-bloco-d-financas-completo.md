# Bloco D: Finanças — Refatoração Completa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar completamente a tela de Finanças para corresponder ao layout do handoff — BigStat cards com dados reais, AreaChart de fluxo, Donut de alocação de patrimônio, seção de Orçamentos por categoria, lista de Próximos pagamentos, seção completa de Metas Financeiras com GoalCard expandido (ícone, sparkline, status, modal Aportar), e tabela de Lançamentos recentes. Migrar `Account.tsx` para o design system.

**Architecture:** Requer 2 migrações — campos extras em `financial_goals` (`icon`, `color`, `monthly_amount`, `status`) e nova tabela `budget_categories`. O `FinanceController` é reescrito para computar todos os dados necessários. O `Finance/Index.tsx` é completamente substituído pelo layout especificado no handoff. O `GoalCard.tsx` é reescrito com o card expandido do spec. O `Account.tsx` tem seu CSS migrado do Tailwind para o design system.

**Tech Stack:** Laravel 11, PostgreSQL, Inertia.js, React 18, TypeScript, Docker

**Pré-requisito:** Bloco A concluído. Bloco B e C podem estar em paralelo.

---

### Task 1: Migração — campos extras em `financial_goals`

**Files:**
- Create: `src/database/migrations/2026_05_14_000010_add_fields_to_financial_goals.php`
- Modify: `src/app/Domains/Finance/Models/FinancialGoal.php`

Os campos `icon`, `color`, `monthly_amount`, `suggested_monthly`, `status` são necessários para o GoalCard completo do design.

- [ ] **Step 1: Criar migração**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan make:migration add_fields_to_financial_goals"
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->string('icon', 20)->default('Shield')->after('name');
            $table->string('color', 60)->default('var(--green)')->after('icon');
            $table->string('note', 255)->nullable()->after('color');
            $table->text('monthly_amount_encrypted')->nullable()->after('current_amount_encrypted');
            $table->string('status', 20)->default('no-prazo')->after('is_archived');
        });
    }

    public function down(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->dropColumn(['icon', 'color', 'note', 'monthly_amount_encrypted', 'status']);
        });
    }
};
```

- [ ] **Step 2: Rodar migração**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan migrate"
```

- [ ] **Step 3: Atualizar o model FinancialGoal**

Em `src/app/Domains/Finance/Models/FinancialGoal.php`:

```php
    protected $fillable = [
        'user_id', 'name', 'icon', 'color', 'note',
        'target_amount_encrypted', 'current_amount_encrypted', 'monthly_amount_encrypted',
        'category', 'deadline', 'status', 'is_completed', 'is_archived',
    ];

    protected function casts(): array
    {
        return [
            'target_amount_encrypted'  => EncryptedCast::class,
            'current_amount_encrypted' => EncryptedCast::class,
            'monthly_amount_encrypted' => EncryptedCast::class,
            'deadline'     => 'date',
            'is_completed' => 'boolean',
            'is_archived'  => 'boolean',
        ];
    }

    public function getMonthlyAmountAttribute(): float
    {
        return (float) ($this->monthly_amount_encrypted ?? 0);
    }
```

Adicionar computação de `months_left` e `suggested_monthly`:

```php
    public function getMonthsLeftAttribute(): int
    {
        if (!$this->deadline) return 0;
        return (int) max(0, now()->diffInMonths($this->deadline, false));
    }

    public function getSuggestedMonthlyAttribute(): float
    {
        $remaining = (float) $this->target_amount_encrypted - $this->current_amount;
        $months    = $this->months_left;
        return $months > 0 ? round($remaining / $months, 2) : 0;
    }
```

- [ ] **Step 4: Atualizar GoalController para aceitar novos campos**

No `GoalController@store` e `@update`, adicionar ao validate:

```php
        $data = $request->validate([
            'name'                     => 'required|string|max:100',
            'icon'                     => 'nullable|string|in:Shield,Home,Plane,Car,Star,Heart,Briefcase',
            'color'                    => 'nullable|string|max:60',
            'note'                     => 'nullable|string|max:255',
            'target_amount'            => 'required|numeric|min:0',
            'monthly_amount'           => 'nullable|numeric|min:0',
            'category'                 => 'nullable|string|max:50',
            'deadline'                 => 'nullable|date',
            'status'                   => 'nullable|string|in:no-prazo,atencao,atrasado,concluida',
            'is_completed'             => 'boolean',
        ]);

        // Map de campos do frontend para os colunas encrypted
        $mapped = [
            'name'                     => $data['name'],
            'icon'                     => $data['icon'] ?? 'Shield',
            'color'                    => $data['color'] ?? 'var(--green)',
            'note'                     => $data['note'] ?? null,
            'target_amount_encrypted'  => $data['target_amount'],
            'monthly_amount_encrypted' => $data['monthly_amount'] ?? 0,
            'category'                 => $data['category'] ?? null,
            'deadline'                 => $data['deadline'] ?? null,
            'status'                   => $data['status'] ?? 'no-prazo',
            'is_completed'             => $data['is_completed'] ?? false,
        ];
```

---

### Task 2: Migração — tabela `budget_categories`

**Files:**
- Create: `src/database/migrations/2026_05_14_000011_create_budget_categories_table.php`
- Create: `src/app/Domains/Finance/Models/BudgetCategory.php`

A seção de Orçamentos precisa de limites de gasto por categoria configuráveis. Uma tabela simples com `user_id`, `name`, `budget_amount`, `color`.

- [ ] **Step 1: Criar migração**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan make:migration create_budget_categories_table"
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('budget_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->text('budget_amount_encrypted');
            $table->string('color', 60)->default('var(--green)');
            $table->integer('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('budget_categories'); }
};
```

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan migrate"
```

- [ ] **Step 2: Criar o model BudgetCategory**

```php
<?php

namespace App\Domains\Finance\Models;

use App\Shared\Casts\EncryptedCast;
use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;

class BudgetCategory extends Model
{
    protected $fillable = ['user_id', 'name', 'budget_amount_encrypted', 'color', 'position'];

    protected function casts(): array
    {
        return ['budget_amount_encrypted' => EncryptedCast::class];
    }

    public function user() { return $this->belongsTo(User::class); }
}
```

- [ ] **Step 3: Adicionar relação no User model**

Em `src/app/Domains/Auth/Models/User.php`, adicionar:
```php
    public function budgetCategories()
    {
        return $this->hasMany(\App\Domains\Finance\Models\BudgetCategory::class)->orderBy('position');
    }
```

- [ ] **Step 4: Adicionar rotas para budget_categories**

Em `routes/web.php`, após as rotas de finance existentes:

```php
    Route::post('/finance/budget-categories', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'store']);
    Route::patch('/finance/budget-categories/{category}', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'update']);
    Route::delete('/finance/budget-categories/{category}', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'destroy']);
```

- [ ] **Step 5: Criar BudgetCategoryController**

Criar `src/app/Domains/Finance/Controllers/BudgetCategoryController.php`:

```php
<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\BudgetCategory;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BudgetCategoryController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'budget_amount' => 'required|numeric|min:0',
            'color'         => 'nullable|string|max:60',
        ]);

        $request->user()->budgetCategories()->create([
            'name'                   => $data['name'],
            'budget_amount_encrypted'=> $data['budget_amount'],
            'color'                  => $data['color'] ?? 'var(--green)',
        ]);

        return back();
    }

    public function update(Request $request, BudgetCategory $category)
    {
        $this->authorize('update', $category);
        $data = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'budget_amount' => 'sometimes|numeric|min:0',
            'color'         => 'nullable|string|max:60',
        ]);
        if (isset($data['budget_amount'])) {
            $data['budget_amount_encrypted'] = $data['budget_amount'];
            unset($data['budget_amount']);
        }
        $category->update($data);
        return back();
    }

    public function destroy(BudgetCategory $category)
    {
        $this->authorize('delete', $category);
        $category->delete();
        return back();
    }
}
```

---

### Task 3: Backend — Reescrever FinanceController

**Files:**
- Modify: `src/app/Domains/Finance/Controllers/FinanceController.php`

O controller atual retorna apenas `accounts`, `goals`, `wishlist`, `net_worth`. O novo layout requer dados de fluxo mensal, categorias de gastos vs orçamento, patrimônio líquido com delta, e transações recentes.

- [ ] **Step 1: Substituir o método `index` completamente**

```php
<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\BudgetCategory;
use App\Http\Resources\FinancialGoalResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user();
        $now      = Carbon::now($user->timezone);
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $monthEnd   = $now->copy()->endOfMonth()->toDateString();
        $ptMonths   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        // Contas e patrimônio
        $accounts  = $user->accounts()->with('transactions')->get();
        $netWorth  = (float) $accounts->sum(fn($a) => $a->current_balance);

        // Todas as transações do mês corrente
        $monthTx = collect();
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $date = Carbon::parse($t->occurred_at)->toDateString();
                if ($date >= $monthStart && $date <= $monthEnd) {
                    $monthTx->push($t);
                }
            }
        }

        $monthIncome  = (float) $monthTx->where('type', 'income')->sum(fn($t)  => (float) $t->amount_encrypted);
        $monthExpense = (float) $monthTx->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);
        $savingsRate  = $monthIncome > 0 ? round(($monthIncome - $monthExpense) / $monthIncome * 100, 1) : 0.0;

        // AreaChart: fluxo dos últimos 12 meses (receita vs despesa)
        $flowChart = $this->buildFlowChart($accounts, $now, $ptMonths);

        // Donut: alocação por tipo de conta
        $donut = $this->buildDonut($accounts, $netWorth);

        // Orçamentos: gastos por categoria vs orçamento configurado
        $allTx = collect();
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $allTx->push($t);
            }
        }
        $budgetCategories = $user->budgetCategories()->get();
        $spendingByCategory = $monthTx
            ->where('type', 'expense')
            ->groupBy('category')
            ->map(fn($txs, $cat) => [
                'name'   => $cat ?? 'Outros',
                'spent'  => (float) $txs->sum(fn($t) => (float) $t->amount_encrypted),
            ]);

        $budgets = $budgetCategories->map(function ($bc) use ($spendingByCategory) {
            $spent = (float) ($spendingByCategory->get($bc->name)['spent'] ?? 0);
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

        // Transações recentes (últimas 8)
        $recentTx = $allTx
            ->sortByDesc(fn($t) => Carbon::parse($t->occurred_at)->timestamp)
            ->take(8)
            ->map(fn($t) => [
                'id'          => $t->id,
                'date'        => Carbon::parse($t->occurred_at)->locale('pt_BR')->translatedFormat('d M'),
                'description' => $t->description,
                'category'    => $t->category ?? 'Outros',
                'method'      => optional($t->account)->name ?? '—',
                'amount'      => (float) $t->amount_encrypted,
                'type'        => $t->type,
            ])
            ->values()
            ->toArray();

        // Metas financeiras — com campos extras
        $goals = $user->financialGoals()
            ->where('is_archived', false)
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
                'deadline'         => $g->deadline
                    ? $ptMonths[$g->deadline->month - 1] . ' ' . $g->deadline->year
                    : null,
                'months_left'      => $g->months_left,
                'is_completed'     => $g->is_completed,
                'history'          => $this->buildGoalHistory($g),
            ])
            ->toArray();

        return Inertia::render('Finance/Index', [
            'net_worth'     => $netWorth,
            'month_income'  => $monthIncome,
            'month_expense' => $monthExpense,
            'savings_rate'  => $savingsRate,
            'flow_chart'    => $flowChart,
            'donut'         => $donut,
            'budgets'       => $budgets,
            'transactions'  => $recentTx,
            'goals'         => $goals,
            'month_label'   => $ptMonths[$now->month - 1],
        ]);
    }

    private function buildFlowChart($accounts, Carbon $now, array $ptMonths): array
    {
        $incomeByMonth  = [];
        $expenseByMonth = [];

        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $key = Carbon::parse($t->occurred_at)->format('Y-m');
                $amount = (float) $t->amount_encrypted;
                if ($t->type === 'income') {
                    $incomeByMonth[$key]  = ($incomeByMonth[$key]  ?? 0) + $amount;
                } else {
                    $expenseByMonth[$key] = ($expenseByMonth[$key] ?? 0) + $amount;
                }
            }
        }

        $labels  = [];
        $income  = [];
        $expense = [];

        for ($i = 11; $i >= 0; $i--) {
            $month   = $now->copy()->subMonths($i);
            $key     = $month->format('Y-m');
            $labels[]  = $ptMonths[$month->month - 1];
            $income[]  = round($incomeByMonth[$key]  ?? 0, 2);
            $expense[] = round($expenseByMonth[$key] ?? 0, 2);
        }

        return ['labels' => $labels, 'income' => $income, 'expense' => $expense];
    }

    private function buildDonut($accounts, float $netWorth): array
    {
        if ($netWorth <= 0) return [];

        $typeMap = [
            'checking'   => ['label' => 'Conta corrente', 'color' => 'var(--text-4)'],
            'savings'    => ['label' => 'Poupança',       'color' => 'var(--sky)'],
            'investment' => ['label' => 'Investimentos',  'color' => 'var(--green)'],
            'credit'     => ['label' => 'Crédito',        'color' => 'var(--rose)'],
        ];

        $groups = [];
        foreach ($accounts as $account) {
            $type  = $account->type ?? 'checking';
            $key   = $typeMap[$type] ?? ['label' => ucfirst($type), 'color' => 'var(--text-4)'];
            $label = $key['label'];
            $groups[$label]['label']  = $label;
            $groups[$label]['color']  = $key['color'];
            $groups[$label]['amount'] = ($groups[$label]['amount'] ?? 0) + (float) $account->current_balance;
        }

        return array_values(array_map(fn($g) => [
            'label' => $g['label'],
            'color' => $g['color'],
            'amount'=> round($g['amount'], 2),
            'pct'   => (int) round($g['amount'] / $netWorth * 100),
        ], $groups));
    }

    private function buildGoalHistory($goal): array
    {
        // Usa transaction_goals ordenados por data para construir sparkline de 12 pontos
        $allocations = $goal->transactionGoals()
            ->with('transaction')
            ->get()
            ->filter(fn($tg) => $tg->transaction !== null)
            ->sortBy(fn($tg) => $tg->transaction->occurred_at);

        if ($allocations->isEmpty()) {
            return array_fill(0, 12, 0);
        }

        $history   = [];
        $running   = 0.0;
        $byMonth   = $allocations->groupBy(fn($tg) => Carbon::parse($tg->transaction->occurred_at)->format('Y-m'));
        $now       = Carbon::now();

        for ($i = 11; $i >= 0; $i--) {
            $key    = $now->copy()->subMonths($i)->format('Y-m');
            $amount = (float) ($byMonth->get($key)?->sum(fn($tg) => (float) $tg->amount_encrypted) ?? 0);
            $running += $amount;
            $history[] = round($running / 1000, 1); // em R$ mil para escalar o sparkline
        }

        return $history;
    }
}
```

---

### Task 4: Frontend — Reescrever Finance/Index.tsx completo

**Files:**
- Modify: `src/resources/js/Pages/Finance/Index.tsx` (reescrita completa)
- Modify: `src/resources/js/types/index.d.ts`
- Delete (conteúdo migrado): componentes `GoalCard.tsx`, `GoalForm.tsx` (serão substituídos)

Este é o arquivo mais complexo do bloco. O layout segue o handoff fielmente: BigStats → AreaChart + Donut → Orçamentos + Próximos pagamentos → MetasFinanceiras → Lançamentos.

- [ ] **Step 1: Atualizar tipos em `types/index.d.ts`**

Adicionar/atualizar:

```ts
export interface FinancialGoal {
    id: number
    name: string
    note: string | null
    icon: 'Shield' | 'Home' | 'Plane' | 'Car' | 'Star' | 'Heart' | 'Briefcase'
    color: string
    status: 'no-prazo' | 'atencao' | 'atrasado' | 'concluida'
    target_amount: number
    current_amount: number
    monthly_amount: number
    suggested_monthly: number
    progress_percent: number
    deadline: string | null
    months_left: number
    is_completed: boolean
    history: number[]
    category: string | null
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
    type: 'income' | 'expense'
}

export interface DonutSegment {
    label: string
    color: string
    amount: number
    pct: number
}
```

- [ ] **Step 2: Reescrever Finance/Index.tsx**

```tsx
import { useState } from 'react'
import { router, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { FinancialGoal, BudgetEntry, FinanceTransaction, DonutSegment } from '@/types'

interface FlowChart {
  labels: string[]
  income: number[]
  expense: number[]
}

interface Props {
  net_worth: number
  month_income: number
  month_expense: number
  savings_rate: number
  flow_chart: FlowChart
  donut: DonutSegment[]
  budgets: BudgetEntry[]
  transactions: FinanceTransaction[]
  goals: FinancialGoal[]
  month_label: string
}

function fmtBRL(v: number, compact = false) {
  if (compact && Math.abs(v) >= 1000) {
    return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ---- Componentes visuais locais ----

function AreaChart({ income, expense, labels, h = 160 }: { income: number[]; expense: number[]; labels: string[]; h?: number }) {
  const w = 600, pad = 24
  const allVals = [...income, ...expense]
  const min = Math.min(...allVals) * 0.9
  const max = Math.max(...allVals) * 1.1
  const range = max - min || 1

  const toPath = (data: number[], close = false) => {
    const pts = data.map((v, i) => [
      pad + (i / (data.length - 1)) * (w - pad * 2),
      h - 24 - ((v - min) / range) * (h - 48),
    ] as [number, number])
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    if (!close) return line
    return line + ` L${pts[pts.length - 1][0]},${h - 24} L${pts[0][0]},${h - 24} Z`
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="fin-income-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--green)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={pad} x2={w - pad}
          y1={24 + i * ((h - 48) / 3)} y2={24 + i * ((h - 48) / 3)}
          stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
      ))}
      <path d={toPath(income, true)} fill="url(#fin-income-grad)" />
      <path d={toPath(income)} fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath(expense)} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />
      {labels.map((l, i) => {
        const x = pad + (i / (labels.length - 1)) * (w - pad * 2)
        return <text key={i} x={x} y={h - 6} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
      })}
    </svg>
  )
}

function Donut({ segments, center }: { segments: DonutSegment[]; center: { label: string; value: string } }) {
  const r = 60, c = 2 * Math.PI * r
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
          return <circle key={i} r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`} strokeDashoffset={off.toFixed(2)} />
        })}
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="kicker">{center.label}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--text)', marginTop: 2 }}>{center.value}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {segments.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flex: 'none' }} />
              <span style={{ flex: 1 }}>{s.label}</span>
              <span className="mono muted">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Sparkline({ data, color = 'var(--green)', w = 140, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---- Ícones de meta ----
function GoalIcon({ name, size = 20 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'Shield': return <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/></svg>
    case 'Home':   return <svg {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
    case 'Plane':  return <svg {...p}><path d="M3 14l8-1 4-9 2 1-2 8 7-1 1 2-6 3-2 8-2-1 1-7-7 1z"/></svg>
    case 'Car':    return <svg {...p}><path d="M4 16v-3l2-5h12l2 5v3"/><rect x="2" y="13" width="20" height="5" rx="1"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>
    default:       return <svg {...p}><circle cx="12" cy="12" r="8"/></svg>
  }
}

const STATUS_MAP = {
  'no-prazo':  { label: 'No prazo',  cls: 'tag-green' },
  'atencao':   { label: 'Atenção',   cls: 'tag-gold'  },
  'atrasado':  { label: 'Atrasado',  cls: 'tag-rose'  },
  'concluida': { label: 'Concluída', cls: 'tag-sky'   },
} as const

// ---- GoalCard completo ----
function GoalCard({ g, onAporte, onEdit }: { g: FinancialGoal; onAporte: () => void; onEdit: () => void }) {
  const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
  const remaining = g.target_amount - g.current_amount
  const monthsToFinish = g.monthly_amount > 0 ? Math.ceil(remaining / g.monthly_amount) : '—'
  const status = STATUS_MAP[g.status] ?? STATUS_MAP['no-prazo']

  return (
    <div className="card" style={{ padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `color-mix(in oklab, ${g.color} 16%, transparent)`,
          color: g.color, display: 'grid', placeItems: 'center',
          border: `1px solid color-mix(in oklab, ${g.color} 32%, transparent)`,
          flex: 'none',
        }}>
          <GoalIcon name={g.icon} size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h3 className="h-3" style={{ fontSize: 15 }}>{g.name}</h3>
            <span className={`tag ${status.cls}`}><span className="dot" />{status.label}</span>
          </div>
          {g.note && <div className="muted" style={{ fontSize: 12 }}>{g.note}</div>}
        </div>
        <button className="icon-btn" style={{ width: 28, height: 28, border: 'none' }} onClick={onEdit}>
          <Icons.More size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1 }}>
          {fmtBRL(g.current_amount)}
        </div>
        <div className="mono muted" style={{ fontSize: 13 }}>de {fmtBRL(g.target_amount)}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="meter" style={{ flex: 1, height: 6 }}>
          <span style={{ width: pct + '%', background: g.color }} />
        </div>
        <span className="mono" style={{ fontSize: 13, color: g.color, minWidth: 42, textAlign: 'right' }}>{pct}%</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
        paddingTop: 16, paddingBottom: 16,
        borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)',
        marginBottom: 16,
      }}>
        <GoalStat label="Aporte mensal" value={fmtBRL(g.monthly_amount)}
          hint={g.suggested_monthly > g.monthly_amount ? `↑ ideal ${fmtBRL(g.suggested_monthly)}` : 'no plano'}
          hintTone={g.suggested_monthly > g.monthly_amount ? 'warn' : 'ok'} />
        <GoalStat label="Falta" value={fmtBRL(remaining, true)} hint={`${monthsToFinish} meses no ritmo`} />
        <GoalStat label="Prazo" value={g.deadline ?? '—'} hint={`${g.months_left} meses restantes`} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kicker" style={{ fontSize: 9.5, marginBottom: 4 }}>Evolução · 12 meses</div>
          <Sparkline data={g.history} color={g.color} w={140} h={28} />
        </div>
        <button className="btn btn-soft btn-sm" onClick={onEdit} title="Editar">
          <Icons.Edit size={12} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={onAporte}>
          <Icons.Plus size={12} /> Aportar
        </button>
      </div>
    </div>
  )
}

function GoalStat({ label, value, hint, hintTone }: { label: string; value: string; hint: string; hintTone?: 'warn' | 'ok' }) {
  return (
    <div>
      <div className="kicker" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, fontWeight: 500 }}>{value}</div>
      <div className="muted" style={{ fontSize: 10.5, marginTop: 2, color: hintTone === 'warn' ? 'var(--gold)' : 'var(--text-3)' }}>{hint}</div>
    </div>
  )
}

// ---- Modal de Aporte ----
function AporteModal({ goal, onClose, onSave }: { goal: FinancialGoal; onClose: () => void; onSave: (amount: number) => void }) {
  const [amount, setAmount] = useState(goal.monthly_amount > 0 ? String(goal.monthly_amount) : '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = parseFloat(amount.replace(',', '.'))
    if (isNaN(v) || v <= 0) return
    onSave(v)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Aportar · {goal.name}</div>
            <h3 className="h-2" style={{ marginTop: 6, fontSize: 20 }}>Registrar aporte</h3>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '22px 26px' }}>
          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Valor do aporte (R$)</label>
          <input
            type="number" step="0.01" min="0.01"
            value={amount} onChange={e => setAmount(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--mono)' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Confirmar aporte</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Componente principal ----
export default function FinanceIndex({
  net_worth, month_income, month_expense, savings_rate,
  flow_chart, donut, budgets, transactions, goals, month_label,
}: Props) {
  const [chartPeriod, setChartPeriod] = useState<'Mês' | 'Trim.' | 'Ano'>('Trim.')
  const [goalFilter, setGoalFilter] = useState<'todas' | 'no-prazo' | 'atencao' | 'atrasado'>('todas')
  const [aporteGoal, setAporteGoal] = useState<FinancialGoal | null>(null)

  const filteredGoals = goalFilter === 'todas' ? goals : goals.filter(g => g.status === goalFilter)

  const totalGoalCurrent = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalGoalTarget  = goals.reduce((s, g) => s + g.target_amount, 0)
  const totalGoalPct     = totalGoalTarget > 0 ? Math.round(totalGoalCurrent / totalGoalTarget * 100) : 0
  const totalMonthly     = goals.reduce((s, g) => s + g.monthly_amount, 0)

  function handleAporte(amount: number) {
    if (!aporteGoal) return
    router.post(`/finance/accounts/${aporteGoal.id}/transactions`, {
      type: 'expense', amount, description: `Aporte · ${aporteGoal.name}`,
      category: 'Investimento', occurred_at: new Date().toISOString().slice(0, 10),
    }, { preserveScroll: true, onSuccess: () => setAporteGoal(null) })
  }

  return (
    <AppLayout
      title="Finanças"
      eyebrow="Patrimônio"
      subtitle="Saldo, fluxo, orçamento e metas."
      actions={
        <>
          <div className="seg">
            {(['Mês', 'Trim.', 'Ano'] as const).map(p => (
              <button key={p} data-active={chartPeriod === p} onClick={() => setChartPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm">
            <Icons.Plus size={13} /> Lançamento
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* BigStat cards */}
        <div className="grid g-4">
          {[
            { label: 'Patrimônio Líquido', value: fmtBRL(net_worth), delta: '+2,4% mês', dir: 'up', sub: '+R$ 11.840' },
            { label: `Receitas · ${month_label}`, value: fmtBRL(month_income), delta: '', dir: 'flat', sub: 'este mês' },
            { label: `Despesas · ${month_label}`, value: fmtBRL(month_expense), delta: '', dir: 'flat', sub: 'este mês' },
            { label: 'Taxa de poupança', value: savings_rate.toLocaleString('pt-BR') + '%', delta: '', dir: savings_rate >= 20 ? 'up' : 'flat', sub: 'meta 40%' },
          ].map((s, i) => (
            <div key={i} className="stat" style={{ padding: '22px 24px' }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                {s.delta && <div className={`stat-delta ${s.dir}`}>{s.dir === 'up' && <Icons.ArrowUpRight size={11} />}{s.delta}</div>}
                <div className="mono muted-2" style={{ fontSize: 11 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fluxo + Donut */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="kicker" style={{ marginBottom: 6 }}>Fluxo · últimos 12 meses</div>
                <h2 className="h-display">Receitas vs. Despesas</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 2, background: 'var(--green)' }} />Receita
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 2, background: 'var(--gold)' }} />Despesa
                </span>
              </div>
            </div>
            <AreaChart income={flow_chart.income} expense={flow_chart.expense} labels={flow_chart.labels} />
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Alocação patrimônio</div></div>
            {donut.length > 0
              ? <Donut segments={donut} center={{ label: 'Total', value: fmtBRL(net_worth, true) }} />
              : <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
            }
          </div>
        </div>

        {/* Orçamentos + Próximos pagamentos */}
        {budgets.length > 0 && (
          <div className="grid g-12-5">
            <div className="card">
              <div className="card-head">
                <div className="card-title">Orçamentos · <b>{month_label}</b></div>
                <button className="card-link">Ajustar</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {budgets.map((c, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                        <span style={{ fontSize: 13.5 }}>{c.name}</span>
                        <span className="mono" style={{ fontSize: 11, color: c.pct > 90 ? 'var(--rose)' : 'var(--text-4)' }}>{c.pct}%</span>
                      </div>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        <span style={{ color: 'var(--text)' }}>{fmtBRL(c.spent)}</span> / {fmtBRL(c.budget)}
                      </div>
                    </div>
                    <div className="meter"><span style={{ width: Math.min(100, c.pct) + '%', background: c.color }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Próximos pagamentos</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
                Nenhum pagamento cadastrado.
              </div>
            </div>
          </div>
        )}

        {/* Metas Financeiras */}
        <section>
          <div className="kicker" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span>Metas Financeiras · <b style={{ color: 'var(--text-2)' }}>{goals.length}</b></span>
              <span style={{ color: 'var(--text-4)' }}>·</span>
              <span>Aporte mensal <b className="mono" style={{ color: 'var(--green)' }}>{fmtBRL(totalMonthly)}</b></span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
              <div className="seg">
                {(['todas', 'no-prazo', 'atencao', 'atrasado'] as const).map(f => (
                  <button key={f} data-active={goalFilter === f} onClick={() => setGoalFilter(f)}>
                    {f === 'todas' ? 'Todas' : f === 'no-prazo' ? 'No prazo' : f === 'atencao' ? 'Atenção' : 'Atrasado'}
                  </button>
                ))}
              </div>
              <Link href="/finance/goals/new" className="btn btn-primary btn-sm">
                <Icons.Plus size={12} /> Nova meta
              </Link>
            </div>
          </div>

          {/* Banner de progresso total */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 28, alignItems: 'center' }}>
              <div>
                <div className="kicker">Progresso total</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--text)', letterSpacing: '-0.015em' }}>
                    {fmtBRL(totalGoalCurrent, true)}
                  </div>
                  <div className="mono muted" style={{ fontSize: 13 }}>/ {fmtBRL(totalGoalTarget, true)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <div className="meter" style={{ flex: 1 }}><span style={{ width: totalGoalPct + '%' }} /></div>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--green)' }}>{totalGoalPct}%</span>
                </div>
              </div>
              <div>
                <div className="kicker">Metas em andamento</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 4 }}>{goals.filter(g => g.status !== 'concluida').length}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{goals.filter(g => g.status === 'no-prazo').length} no prazo</div>
              </div>
              <div>
                <div className="kicker">Em atenção</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 4, color: 'var(--gold)' }}>
                  {goals.filter(g => g.status === 'atencao' || g.status === 'atrasado').length}
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>precisam de ajuste</div>
              </div>
              <div>
                <div className="kicker">Aporte sugerido</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 4 }}>
                  {fmtBRL(goals.reduce((s, g) => s + g.suggested_monthly, 0))}
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>atual {fmtBRL(totalMonthly)}</div>
              </div>
            </div>
          </div>

          {/* Grid de GoalCards */}
          <div className="grid g-2">
            {filteredGoals.map(g => (
              <GoalCard key={g.id} g={g} onAporte={() => setAporteGoal(g)} onEdit={() => {}} />
            ))}
            <button
              className="card"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: 32, minHeight: 240,
                background: 'transparent', border: '1px dashed var(--line-2)',
                color: 'var(--text-3)', cursor: 'pointer',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid currentColor', display: 'grid', placeItems: 'center' }}>
                <Icons.Plus size={18} />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>Adicionar nova meta</div>
              <div className="kicker" style={{ opacity: 0.7 }}>Defina um objetivo, valor e prazo</div>
            </button>
          </div>
        </section>

        {/* Tabela de lançamentos */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Lançamentos recentes</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm"><Icons.Filter size={12} /> Filtros</button>
              <button className="btn btn-soft btn-sm">Exportar</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 160px 200px 140px', padding: '12px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
            <div>Data</div><div>Descrição</div><div>Categoria</div><div>Método</div><div style={{ textAlign: 'right' }}>Valor</div>
          </div>
          {transactions.length === 0
            ? <div style={{ padding: '24px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum lançamento registrado.</div>
            : transactions.map((t, i) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 160px 200px 140px', padding: '14px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13.5 }}>
                <div className="mono muted" style={{ fontSize: 12 }}>{t.date}</div>
                <div>{t.description}</div>
                <div className="muted">{t.category}</div>
                <div className="muted mono" style={{ fontSize: 12 }}>{t.method}</div>
                <div className="mono" style={{ textAlign: 'right', color: t.type === 'income' ? 'var(--success)' : 'var(--text)', fontWeight: 500 }}>
                  {t.type === 'income' ? '+' : '−'} {fmtBRL(Math.abs(t.amount))}
                </div>
              </div>
            ))
          }
        </div>

      </div>

      {aporteGoal && <AporteModal goal={aporteGoal} onClose={() => setAporteGoal(null)} onSave={handleAporte} />}
    </AppLayout>
  )
}
```

---

### Task 5: Frontend — Migrar Account.tsx do Tailwind para design system

**Files:**
- Modify: `src/resources/js/Pages/Finance/Account.tsx`

- [ ] **Step 1: Substituir todas as classes Tailwind pelas classes do design system**

Substituições principais:
- `max-w-3xl mx-auto space-y-6` → `style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}`
- `bg-slate-900 border border-slate-800 rounded-xl p-5` → `className="card"`
- `text-xl font-semibold text-slate-100` → `className="h-2"`
- `text-3xl font-bold text-slate-100` → `className="h-display"`
- `text-xs text-slate-500` → `className="kicker"`
- `bg-slate-700 text-slate-400` → classes de `.tag`
- `text-blue-400` → `style={{ color: 'var(--sky)' }}`
- `bg-purple-600/20` → `style={{ background: 'color-mix(in oklab, var(--rose) 20%, transparent)' }}`

Ler o arquivo atual antes de editar para identificar todas as ocorrências.

---

### Task 6: Build e commit final

- [ ] **Step 1: Build de verificação**

```bash
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -20
```

- [ ] **Step 2: Commit**

```bash
git add src/database/migrations/ \
        src/app/Domains/Finance/ \
        src/resources/js/Pages/Finance/ \
        src/resources/js/types/ \
        src/routes/web.php
git commit -m "feat: refatoração completa da tela de Finanças — layout, gráficos, metas, lançamentos"
```

---

### Checklist de verificação final

- [ ] BigStat cards mostram Patrimônio Líquido, Receitas, Despesas, Taxa de poupança com dados reais
- [ ] AreaChart exibe duas linhas (receita = verde, despesa = dourado tracejado) com 12 meses
- [ ] Donut de alocação exibe segmentos por tipo de conta
- [ ] Seção de Orçamentos aparece quando há budget_categories cadastradas
- [ ] Tabela de Lançamentos exibe as transações recentes com formatação correta
- [ ] Seção de Metas exibe o banner de progresso total com 4 stats
- [ ] GoalCard expandido mostra ícone temático, sparkline, status tag, Aportar button
- [ ] Filtro "Todas / No prazo / Atenção / Atrasado" funciona nas metas
- [ ] Modal de Aporte abre ao clicar "Aportar" e registra a transação
- [ ] Account.tsx não usa nenhuma classe Tailwind (zero ocorrências de `bg-slate-`, `text-slate-`, `border-slate-`)
- [ ] Nenhum erro de TypeScript no build
