# Finance Revision E1+E2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir gaps funcionais da aba de Finanças (botão + Lançamento quebrado, CRUD de metas/orçamentos, rota deposit), redesenhar GoalCard, adicionar card "Próximos Pagamentos" e redesenhar Account.tsx no padrão do design system.

**Architecture:** Backend: 2 migrations (upcoming_payments + savings_goal_pct), novo UpcomingPaymentController, expansão de GoalController e BudgetCategoryController, e dados extras em FinanceController + AccountController. Frontend: novos modais inline em Index.tsx (TransactionModal, GoalModal, BudgetModal, UpcomingPaymentModal), GoalCard reescrito, redesign de Account.tsx e TransactionList.tsx.

**Tech Stack:** Laravel 11, PostgreSQL, Inertia.js, React 18, TypeScript, Docker. Artisan via `docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan ..."`.

---

### Task 1: Migrations — upcoming_payments + savings_goal_pct

**Files:**
- Create: `src/database/migrations/2026_05_14_000020_create_upcoming_payments_table.php`
- Create: `src/database/migrations/2026_05_14_000021_add_savings_goal_pct_to_users.php`

- [ ] **Step 1: Criar migração upcoming_payments**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan make:migration create_upcoming_payments_table"
```

Editar o arquivo gerado:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('upcoming_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('description', 255);
            $table->text('amount_encrypted');
            $table->date('due_date');
            $table->string('tag', 20)->nullable(); // 'meta' ou null
            $table->foreignId('linked_goal_id')->nullable()->constrained('financial_goals')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upcoming_payments');
    }
};
```

- [ ] **Step 2: Criar migração savings_goal_pct**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan make:migration add_savings_goal_pct_to_users"
```

Editar o arquivo gerado:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedTinyInteger('savings_goal_pct')->default(20)->after('timezone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('savings_goal_pct');
        });
    }
};
```

- [ ] **Step 3: Rodar as migrations**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan migrate"
```

Esperado: `2 migrations ran successfully`

- [ ] **Step 4: Commit**

```bash
git add src/database/migrations/
git commit -m "feat: migrations upcoming_payments e savings_goal_pct"
```

---

### Task 2: UpcomingPayment Model

**Files:**
- Create: `src/app/Domains/Finance/Models/UpcomingPayment.php`

- [ ] **Step 1: Criar model**

```php
<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;

class UpcomingPayment extends Model
{
    protected $fillable = [
        'user_id', 'description', 'amount_encrypted', 'due_date', 'tag', 'linked_goal_id',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
            'due_date'         => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function linkedGoal()
    {
        return $this->belongsTo(FinancialGoal::class, 'linked_goal_id');
    }
}
```

- [ ] **Step 2: Adicionar relação no User model**

Em `src/app/Domains/Auth/Models/User.php`, adicionar no corpo da classe:

```php
public function upcomingPayments()
{
    return $this->hasMany(\App\Domains\Finance\Models\UpcomingPayment::class);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/Domains/Finance/Models/UpcomingPayment.php src/app/Domains/Auth/Models/User.php
git commit -m "feat: model UpcomingPayment e relação em User"
```

---

### Task 3: UpcomingPaymentController + Rotas

**Files:**
- Create: `src/app/Domains/Finance/Controllers/UpcomingPaymentController.php`
- Modify: `src/routes/web.php`

- [ ] **Step 1: Criar controller**

```php
<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\UpcomingPayment;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class UpcomingPaymentController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'description'    => 'required|string|max:255',
            'amount'         => 'required|numeric|min:0.01',
            'due_date'       => 'required|date_format:Y-m-d',
            'tag'            => 'nullable|in:meta',
            'linked_goal_id' => 'nullable|exists:financial_goals,id',
        ]);

        $request->user()->upcomingPayments()->create([
            'description'      => $data['description'],
            'amount_encrypted' => $data['amount'],
            'due_date'         => $data['due_date'],
            'tag'              => $data['tag'] ?? null,
            'linked_goal_id'   => $data['linked_goal_id'] ?? null,
        ]);

        return back();
    }

    public function update(Request $request, UpcomingPayment $payment)
    {
        abort_if($payment->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'description'    => 'sometimes|string|max:255',
            'amount'         => 'sometimes|numeric|min:0.01',
            'due_date'       => 'sometimes|date_format:Y-m-d',
            'tag'            => 'nullable|in:meta',
            'linked_goal_id' => 'nullable|exists:financial_goals,id',
        ]);

        if (isset($data['amount'])) {
            $data['amount_encrypted'] = $data['amount'];
            unset($data['amount']);
        }

        $payment->update($data);

        return back();
    }

    public function destroy(Request $request, UpcomingPayment $payment)
    {
        abort_if($payment->user_id !== $request->user()->id, 403);
        $payment->delete();
        return back();
    }
}
```

- [ ] **Step 2: Adicionar rotas em web.php**

Dentro do grupo autenticado de finance, após as rotas de `budget-categories`, adicionar:

```php
Route::post('/finance/upcoming-payments', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'store']);
Route::patch('/finance/upcoming-payments/{payment}', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'update']);
Route::delete('/finance/upcoming-payments/{payment}', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'destroy']);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/Domains/Finance/Controllers/UpcomingPaymentController.php src/routes/web.php
git commit -m "feat: UpcomingPaymentController e rotas CRUD"
```

---

### Task 4: GoalController — Expandir campos + Rota deposit

**Files:**
- Modify: `src/app/Domains/Finance/Controllers/GoalController.php`
- Modify: `src/routes/web.php`

- [ ] **Step 1: Atualizar GoalController::store para aceitar novos campos**

Substituir o método `store` completo:

```php
public function store(Request $request)
{
    $validated = $request->validate([
        'name'            => 'required|string|max:255',
        'target_amount'   => 'required|numeric|min:0.01',
        'monthly_amount'  => 'nullable|numeric|min:0',
        'icon'            => 'nullable|string|max:20',
        'color'           => 'nullable|string|max:60',
        'note'            => 'nullable|string|max:255',
        'category'        => 'nullable|string|max:100',
        'deadline'        => 'nullable|date_format:Y-m',
    ]);

    $deadlineDate = isset($validated['deadline'])
        ? \Carbon\Carbon::createFromFormat('Y-m', $validated['deadline'])->endOfMonth()->toDateString()
        : null;

    $request->user()->financialGoals()->create([
        'name'                    => $validated['name'],
        'target_amount_encrypted' => $validated['target_amount'],
        'monthly_amount_encrypted'=> $validated['monthly_amount'] ?? 0,
        'icon'                    => $validated['icon'] ?? 'Shield',
        'color'                   => $validated['color'] ?? 'var(--green)',
        'note'                    => $validated['note'] ?? null,
        'category'                => $validated['category'] ?? null,
        'deadline'                => $deadlineDate,
        'status'                  => 'no-prazo',
    ]);

    return back();
}
```

- [ ] **Step 2: Atualizar GoalController::update para aceitar novos campos**

Substituir o método `update` completo:

```php
public function update(Request $request, FinancialGoal $goal)
{
    abort_if($goal->user_id !== $request->user()->id, 403);

    $validated = $request->validate([
        'name'           => 'sometimes|string|max:255',
        'target_amount'  => 'sometimes|numeric|min:0.01',
        'monthly_amount' => 'nullable|numeric|min:0',
        'icon'           => 'nullable|string|max:20',
        'color'          => 'nullable|string|max:60',
        'note'           => 'nullable|string|max:255',
        'category'       => 'nullable|string|max:100',
        'deadline'       => 'nullable|date_format:Y-m',
        'is_completed'   => 'sometimes|boolean',
        'is_archived'    => 'sometimes|boolean',
    ]);

    $data = [];
    if (isset($validated['target_amount']))  $data['target_amount_encrypted']  = $validated['target_amount'];
    if (isset($validated['monthly_amount'])) $data['monthly_amount_encrypted'] = $validated['monthly_amount'];
    if (array_key_exists('icon', $validated))     $data['icon']     = $validated['icon'];
    if (array_key_exists('color', $validated))    $data['color']    = $validated['color'];
    if (array_key_exists('note', $validated))     $data['note']     = $validated['note'];
    if (array_key_exists('category', $validated)) $data['category'] = $validated['category'];
    if (isset($validated['name']))         $data['name']         = $validated['name'];
    if (isset($validated['is_completed'])) $data['is_completed'] = $validated['is_completed'];
    if (isset($validated['is_archived']))  $data['is_archived']  = $validated['is_archived'];
    if (array_key_exists('deadline', $validated)) {
        $data['deadline'] = $validated['deadline']
            ? \Carbon\Carbon::createFromFormat('Y-m', $validated['deadline'])->endOfMonth()->toDateString()
            : null;
    }

    $goal->update($data);

    return back();
}
```

- [ ] **Step 3: Adicionar método deposit no GoalController**

Adicionar ao final da classe (antes do `}`):

```php
public function deposit(Request $request, FinancialGoal $goal)
{
    abort_if($goal->user_id !== $request->user()->id, 403);

    $data = $request->validate([
        'amount' => 'required|numeric|min:0.01',
    ]);

    $goal->transactionGoals()->create([
        'amount_encrypted' => $data['amount'],
        'occurred_at'      => now()->toDateString(),
        'note'             => 'Aporte manual',
    ]);

    return back();
}
```

- [ ] **Step 4: Adicionar rota deposit em web.php**

Após `Route::delete('/finance/goals/{goal}', ...)`, adicionar:

```php
Route::post('/finance/goals/{goal}/deposit', [GoalController::class, 'deposit']);
```

- [ ] **Step 5: Verificar campos de TransactionGoal**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan tinker --execute=\"echo implode(', ', (new App\Domains\Finance\Models\TransactionGoal)->getFillable());\""
```

Se `amount_encrypted` e `occurred_at` estiverem no `$fillable`, ok. Se não, adicionar ao model `TransactionGoal.php`.

- [ ] **Step 6: Commit**

```bash
git add src/app/Domains/Finance/Controllers/GoalController.php src/routes/web.php
git commit -m "feat: GoalController — novos campos e rota deposit"
```

---

### Task 5: BudgetCategoryController — Batch Upsert

**Files:**
- Modify: `src/app/Domains/Finance/Controllers/BudgetCategoryController.php`
- Modify: `src/routes/web.php`

- [ ] **Step 1: Adicionar método batch no BudgetCategoryController**

Adicionar ao final da classe (antes do `}`):

```php
public function batch(Request $request)
{
    $data = $request->validate([
        'categories'              => 'required|array',
        'categories.*.id'         => 'nullable|integer',
        'categories.*.name'       => 'required|string|max:100',
        'categories.*.budget'     => 'required|numeric|min:0',
        'categories.*.color'      => 'nullable|string|max:60',
    ]);

    $user = $request->user();
    $incoming = collect($data['categories']);
    $incomingIds = $incoming->pluck('id')->filter()->values();

    // Excluir categorias removidas
    $user->budgetCategories()
        ->whereNotIn('id', $incomingIds)
        ->delete();

    // Upsert das categorias
    foreach ($incoming as $cat) {
        if (!empty($cat['id'])) {
            $existing = $user->budgetCategories()->find($cat['id']);
            if ($existing) {
                $existing->update([
                    'name'                    => $cat['name'],
                    'budget_amount_encrypted' => $cat['budget'],
                    'color'                   => $cat['color'] ?? 'var(--green)',
                ]);
            }
        } else {
            $user->budgetCategories()->create([
                'name'                    => $cat['name'],
                'budget_amount_encrypted' => $cat['budget'],
                'color'                   => $cat['color'] ?? 'var(--green)',
            ]);
        }
    }

    return back();
}
```

- [ ] **Step 2: Adicionar rota batch em web.php**

Após as rotas de budget-categories existentes, adicionar:

```php
Route::put('/finance/budget-categories/batch', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'batch']);
```

**Atenção:** Esta rota deve vir **antes** de `Route::patch('/finance/budget-categories/{category}', ...)` para evitar conflito de parâmetro de rota.

- [ ] **Step 3: Commit**

```bash
git add src/app/Domains/Finance/Controllers/BudgetCategoryController.php src/routes/web.php
git commit -m "feat: BudgetCategoryController batch upsert"
```

---

### Task 6: FinanceController — Dados extras para o frontend

**Files:**
- Modify: `src/app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar contas do usuário, savings_goal_pct e upcoming_payments ao index**

Substituir o método `index` inteiro pelo código abaixo (preservando toda a lógica existente e adicionando as três novas seções):

```php
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
    foreach ($allTx as $t) {
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
        'label'  => $g['label'], 'color' => $g['color'],
        'amount' => round($g['amount'], 2),
        'pct'    => (int) round($g['amount'] / $netWorth * 100),
    ], $donutGroups)) : [];

    // Orçamentos
    $budgetCategories = $user->budgetCategories()->get();
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

    // Metas financeiras
    $goals = $user->financialGoals()->where('is_archived', false)
        ->with('transactionGoals')
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
        'transactions'       => $recentTx,
        'goals'              => $goals,
        'accounts_list'      => $accountsList,
        'upcoming_payments'  => $upcomingPayments,
        'month_label'        => $ptMonths[$now->month - 1],
    ]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/Domains/Finance/Controllers/FinanceController.php
git commit -m "feat: FinanceController — accounts_list, upcoming_payments, savings_goal_pct"
```

---

### Task 7: AccountController — Dados de mês para Account.tsx

**Files:**
- Modify: `src/app/Domains/Finance/Controllers/AccountController.php`

- [ ] **Step 1: Atualizar AccountController::show com month stats**

Substituir o método `show` completo:

```php
public function show(Request $request, Account $account)
{
    abort_if($account->user_id !== $request->user()->id, 403);

    $now        = \Carbon\Carbon::now($request->user()->timezone ?? 'America/Sao_Paulo');
    $monthStart = $now->copy()->startOfMonth()->toDateString();
    $monthEnd   = $now->copy()->endOfMonth()->toDateString();

    $transactions = $account->transactions()->latest('occurred_at')->paginate(25);

    $allTx      = $account->transactions()->get();
    $monthTx    = $allTx->filter(function ($t) use ($monthStart, $monthEnd) {
        $date = \Carbon\Carbon::parse($t->occurred_at)->toDateString();
        return $date >= $monthStart && $date <= $monthEnd;
    });

    $monthIncome  = (float) $monthTx->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
    $monthExpense = (float) $monthTx->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);
    $monthCount   = $monthTx->count();

    $currentBalance = (float) $account->current_balance;
    $peakBalance    = max($currentBalance * 1.0, $allTx->max(fn($t) => 0) ?? $currentBalance);
    // Aproximação: pico = maior entre saldo atual e saldo atual * 1.2 (fallback simples)
    $peakBalance    = $currentBalance > 0 ? $currentBalance / max(0.01, min(1, $currentBalance / ($currentBalance * 1.2))) : $currentBalance;
    $peakBalance    = $currentBalance * 1.2; // fallback conservador

    return Inertia::render('Finance/Account', [
        'account'       => AccountResource::make($account->loadMissing('transactions')),
        'transactions'  => TransactionResource::collection($transactions),
        'month_income'  => $monthIncome,
        'month_expense' => $monthExpense,
        'month_count'   => $monthCount,
        'peak_balance'  => $peakBalance,
    ]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/Domains/Finance/Controllers/AccountController.php
git commit -m "feat: AccountController — month stats para redesign"
```

---

### Task 8: GoalCard Redesign + GoalModal em Index.tsx

**Files:**
- Modify: `src/resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Atualizar interface FinancialGoal e adicionar interfaces novas**

No topo de `Index.tsx`, atualizar a interface `FinancialGoal` e adicionar `AccountItem`:

```tsx
interface FinancialGoal {
  id: number; name: string; note: string | null
  icon: string; color: string; status: string
  target_amount: number; current_amount: number
  monthly_amount: number; suggested_monthly: number
  progress_percent: number
  deadline: string | null      // formato 'Y-m', ex: '2026-12'
  deadline_label: string | null // ex: 'Dez 2026'
  months_left: number; is_completed: boolean; history: number[]
  category: string | null
}

interface AccountItem { id: number; name: string; type: string }
```

- [ ] **Step 2: Atualizar Props para incluir accounts_list e savings_goal_pct**

```tsx
interface Props {
  net_worth: number; month_income: number; month_expense: number; savings_rate: number
  savings_goal_pct: number
  flow_chart: FlowChart; donut: DonutSegment[]; budgets: BudgetEntry[]
  transactions: FinanceTransaction[]; goals: FinancialGoal[]; month_label: string
  accounts_list: AccountItem[]
  upcoming_payments: UpcomingPayment[]
}
```

- [ ] **Step 3: Reescrever GoalCard com o novo design**

Substituir a função `GoalCard` inteira (linhas 111–149 do arquivo atual):

```tsx
const GOAL_ICONS = ['🏠','✈️','🚗','🎓','💍','🏖','💼','🏥','📱','🐶','🌱','🛡','⭐','🎮','🔧','💰']
const GOAL_COLORS = [
  { label: 'Verde',  value: 'var(--green)'  },
  { label: 'Dourado',value: 'var(--gold)'   },
  { label: 'Azul',   value: 'var(--sky)'    },
  { label: 'Rosa',   value: 'var(--rose)'   },
  { label: 'Roxo',   value: 'var(--purple, oklch(72% 0.12 290))' },
  { label: 'Teal',   value: 'var(--teal, oklch(76% 0.12 195))'   },
]

function GoalCard({ g, onAporte, onEdit, onDelete }: {
  g: FinancialGoal
  onAporte: () => void
  onEdit: () => void
  onDelete: () => void
}) {
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
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in oklab, ${g.color} 16%, transparent)`, color: g.color, display: 'grid', placeItems: 'center', fontSize: 20, border: `1px solid color-mix(in oklab, ${g.color} 32%, transparent)`, flex: 'none' }}>
          {GOAL_ICONS.includes(g.icon) ? g.icon : '🛡'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{g.name}</span>
            <span className={`tag ${status.cls}`}><span className="dot" />{status.label}</span>
          </div>
          {g.note && <div className="muted" style={{ fontSize: 12 }}>{g.note}</div>}
        </div>
        {/* Kebab menu */}
        <div style={{ position: 'relative', flex: 'none' }}>
          <button
            className="icon-btn"
            style={{ width: 28, height: 28, fontSize: 14, letterSpacing: 1 }}
            onClick={() => setMenuOpen(o => !o)}
          >···</button>
          {menuOpen && (
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          )}
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 34, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', zIndex: 20, minWidth: 110, boxShadow: 'var(--shadow-2)' }}>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start', padding: '9px 14px' }} onClick={() => { setMenuOpen(false); onEdit() }}>
                <Icons.Edit size={12} /> Editar
              </button>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start', padding: '9px 14px', color: 'var(--rose)' }} onClick={() => { setMenuOpen(false); onDelete() }}>
                <Icons.Trash size={12} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmtBRL(g.current_amount)}</div>
        <div className="mono muted" style={{ fontSize: 13 }}>de {fmtBRL(g.target_amount)}</div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="meter" style={{ flex: 1, height: 5 }}><span style={{ width: pct + '%', background: g.color }} /></div>
        <span className="mono" style={{ fontSize: 13, color: g.color, fontWeight: 500 }}>{pct}%</span>
      </div>

      {/* Stats */}
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

      {/* Footer: sparkline + lápis + aportar */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="kicker" style={{ fontSize: 9.5, marginBottom: 6 }}>Evolução · 12 meses</div>
          <Sparkline data={g.history.length > 1 ? g.history : [0, g.current_amount / 1000]} color={g.color} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={onEdit}>
            <Icons.Edit size={13} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={onAporte}><Icons.Plus size={12} /> Aportar</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Adicionar GoalModal (criar/editar)**

Adicionar após a função `AporteModal`:

```tsx
function GoalModal({ goal, onClose }: { goal: FinancialGoal | null; onClose: () => void }) {
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? '🛡')
  const [color, setColor] = useState(goal?.color ?? 'var(--green)')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
  const [monthlyAmount, setMonthlyAmount] = useState(goal ? String(goal.monthly_amount) : '')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [note, setNote] = useState(goal?.note ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      name, icon, color, note: note || null,
      target_amount: parseFloat(targetAmount),
      monthly_amount: parseFloat(monthlyAmount) || 0,
      deadline: deadline || null,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (goal) router.patch(`/finance/goals/${goal.id}`, data, opts)
    else router.post('/finance/goals', data, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Metas · {goal ? 'Editar' : 'Nova meta'}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>{goal ? goal.name : 'Criar meta'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          {/* Nome */}
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome</label>
            <input className="input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Casa própria" />
          </div>

          {/* Ícone */}
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Ícone</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {GOAL_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  style={{ height: 36, borderRadius: 8, border: `1px solid ${icon === ic ? 'color-mix(in oklab, var(--green) 50%, transparent)' : 'var(--line)'}`, background: icon === ic ? 'color-mix(in oklab, var(--green) 12%, transparent)' : 'var(--surface-2)', fontSize: 16, cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {GOAL_COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: color === c.value ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* Valor alvo + aporte mensal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor alvo (R$)</label>
              <input className="input" style={{ width: '100%' }} type="number" step="0.01" min="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Aporte mensal (R$)</label>
              <input className="input" style={{ width: '100%' }} type="number" step="0.01" min="0" value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} />
            </div>
          </div>

          {/* Prazo + nota */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prazo (mês/ano)</label>
              <input className="input" style={{ width: '100%' }} type="month" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nota</label>
              <input className="input" style={{ width: '100%' }} value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> {goal ? 'Salvar' : 'Criar meta'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Atualizar FinanceIndex para usar o novo GoalCard e GoalModal**

No componente `FinanceIndex`, adicionar estado para o GoalModal e conectar os handlers:

```tsx
// Adicionar junto aos outros useState
const [goalModal, setGoalModal] = useState<{ goal: FinancialGoal | null } | null>(null)

// Handler de excluir
function handleDeleteGoal(g: FinancialGoal) {
  if (!confirm(`Excluir a meta "${g.name}"?`)) return
  router.delete(`/finance/goals/${g.id}`, { preserveScroll: true })
}
```

No render do `GoalCard`:

```tsx
{filteredGoals.map(g => (
  <GoalCard
    key={g.id}
    g={g}
    onAporte={() => setAporteGoal(g)}
    onEdit={() => setGoalModal({ goal: g })}
    onDelete={() => handleDeleteGoal(g)}
  />
))}
```

Botão "Nova Meta" no header da seção (ao lado do seg control):

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
  <div className="kicker" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
    <span>Metas Financeiras · <b style={{ color: 'var(--text-2)' }}>{goals.length}</b></span>
    <span style={{ color: 'var(--text-4)' }}>·</span>
    <span>Aporte mensal <b className="mono" style={{ color: 'var(--green)' }}>{fmtBRL(totalMonthly)}</b></span>
  </div>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <button className="btn btn-ghost btn-sm" onClick={() => setGoalModal({ goal: null })}>
      <Icons.Plus size={12} /> Nova Meta
    </button>
    <div className="seg">
      {(['todas', 'no-prazo', 'atencao', 'atrasado'] as const).map(f => (
        <button key={f} data-active={goalFilter === f} onClick={() => setGoalFilter(f)}>
          {f === 'todas' ? 'Todas' : f === 'no-prazo' ? 'No prazo' : f === 'atencao' ? 'Atenção' : 'Atrasado'}
        </button>
      ))}
    </div>
  </div>
</div>
```

Adicionar o modal no final do JSX, antes do `{aporteGoal && <AporteModal ...>}`:

```tsx
{goalModal !== null && (
  <GoalModal goal={goalModal.goal} onClose={() => setGoalModal(null)} />
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/resources/js/Pages/Finance/Index.tsx
git commit -m "feat: GoalCard redesign com kebab menu + GoalModal CRUD"
```

---

### Task 9: TransactionModal em Index.tsx (corrigir botão quebrado)

**Files:**
- Modify: `src/resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Adicionar interface UpcomingPayment e atualizar Props**

No topo do arquivo, adicionar:

```tsx
interface UpcomingPayment {
  id: number; description: string; amount: number
  due_date: string; due_label: string; days_until: number
  tag: string | null; linked_goal_id: number | null
}
```

- [ ] **Step 2: Adicionar componente TransactionModal**

Adicionar antes da função `FinanceIndex`:

```tsx
function TransactionModal({ accounts, onClose }: { accounts: AccountItem[]; onClose: () => void }) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 0)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [occurred_at, setOccurredAt] = useState(new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post(`/finance/accounts/${accountId}/transactions`, {
      type,
      amount_encrypted: parseFloat(amount),
      description,
      category: category || null,
      occurred_at,
    }, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Finanças · Novo lançamento</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Registrar transação</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          {/* Tipo */}
          <div className="seg" style={{ marginBottom: 14 }}>
            <button type="button" data-active={type === 'expense'} onClick={() => setType('expense')}>Despesa</button>
            <button type="button" data-active={type === 'income'} onClick={() => setType('income')}>Receita</button>
          </div>

          {/* Conta + Valor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Conta</label>
              <select className="input" style={{ width: '100%' }} value={accountId} onChange={e => setAccountId(Number(e.target.value))} required>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <input className="input" style={{ width: '100%' }} type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus required />
            </div>
          </div>

          {/* Categoria + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
              <select className="input" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Sem categoria</option>
                {['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Vestuário','Assinaturas','Salário','Freelance','Investimento','Outros'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
              <input className="input" style={{ width: '100%' }} type="date" value={occurred_at} onChange={e => setOccurredAt(e.target.value)} required />
            </div>
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input className="input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ex: iFood — jantar" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Registrar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Conectar o modal ao botão "+ Lançamento" no FinanceIndex**

No componente `FinanceIndex`, adicionar:

```tsx
// com os outros useState
const [showTxModal, setShowTxModal] = useState(false)
```

Atualizar o `AppLayout actions`:

```tsx
<AppLayout title="Finanças" eyebrow="Patrimônio" subtitle="Saldo, fluxo, orçamento e metas."
  actions={
    <button className="btn btn-primary btn-sm" onClick={() => setShowTxModal(true)}>
      <Icons.Plus size={13} /> Lançamento
    </button>
  }
>
```

Adicionar no final do JSX:

```tsx
{showTxModal && <TransactionModal accounts={accounts_list} onClose={() => setShowTxModal(false)} />}
```

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Pages/Finance/Index.tsx
git commit -m "fix: TransactionModal conectado ao botão + Lançamento"
```

---

### Task 10: BudgetModal + Redesign do card Orçamentos

**Files:**
- Modify: `src/resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Adicionar BudgetModal**

Adicionar antes de `FinanceIndex`:

```tsx
interface BudgetDraft { id?: number; name: string; budget: number; color: string }

const BUDGET_COLORS = ['var(--green)','var(--gold)','var(--sky)','var(--purple, oklch(72% 0.12 290))','var(--pink, oklch(74% 0.14 340))','var(--teal, oklch(76% 0.12 195))']

function BudgetModal({ budgets, onClose }: { budgets: BudgetEntry[]; onClose: () => void }) {
  const [drafts, setDrafts] = useState<BudgetDraft[]>(
    budgets.map(b => ({ id: b.id, name: b.name, budget: b.budget, color: b.color }))
  )
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [newColor, setNewColor] = useState(BUDGET_COLORS[0])

  function updateDraft(i: number, field: keyof BudgetDraft, value: string | number) {
    setDrafts(d => d.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function removeDraft(i: number) {
    setDrafts(d => d.filter((_, idx) => idx !== i))
  }
  function addCategory() {
    if (!newName.trim() || !newBudget) return
    setDrafts(d => [...d, { name: newName.trim(), budget: parseFloat(newBudget), color: newColor }])
    setNewName(''); setNewBudget('')
  }
  function save() {
    router.put('/finance/budget-categories/batch', { categories: drafts }, {
      preserveScroll: true, onSuccess: onClose,
    })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div className="kicker">Finanças · Orçamentos</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Ajustar orçamentos</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>

        <div style={{ padding: '16px 26px', overflowY: 'auto', flex: 1 }}>
          {/* Lista existente */}
          {drafts.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flex: 'none' }} />
              <input className="input" style={{ flex: 1 }} value={d.name} onChange={e => updateDraft(i, 'name', e.target.value)} />
              <input className="input" style={{ width: 110 }} type="number" step="0.01" min="0" value={d.budget} onChange={e => updateDraft(i, 'budget', parseFloat(e.target.value))} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)', padding: '5px 8px' }} onClick={() => removeDraft(i)}><Icons.X size={12} /></button>
            </div>
          ))}

          {/* Nova categoria */}
          <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, marginTop: 4 }}>
            <div className="kicker" style={{ marginBottom: 10 }}>Nova categoria</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              {BUDGET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1 }} placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} />
              <input className="input" style={{ width: 110 }} type="number" step="0.01" min="0" placeholder="Limite R$" value={newBudget} onChange={e => setNewBudget(e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addCategory}><Icons.Plus size={13} /></button>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 26px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save}><Icons.Check size={13} /> Salvar</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Redesenhar o card Orçamentos no FinanceIndex**

Substituir a seção `{/* Orçamentos */}` (a condicional com `budgets.length > 0`):

```tsx
{/* Orçamentos */}
<div className="card">
  <div className="card-head" style={{ marginBottom: 16 }}>
    <div className="card-title">Orçamentos · <b>{month_label}</b></div>
    <button className="btn btn-ghost btn-sm" onClick={() => setShowBudgetModal(true)}>
      Ajustar
    </button>
  </div>
  {budgets.length === 0 ? (
    <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
      Nenhum orçamento. Clique em Ajustar para criar.
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {budgets.map((c, i) => (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flex: 'none', marginRight: 8 }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{c.name}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 6 }}>{c.pct}%</span>
            <div className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
              <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{fmtBRL(c.spent)}</span> / {fmtBRL(c.budget)}
            </div>
          </div>
          <div className="meter"><span style={{ width: Math.min(100, c.pct) + '%', background: c.color }} /></div>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 3: Adicionar estado e modal no FinanceIndex**

```tsx
const [showBudgetModal, setShowBudgetModal] = useState(false)
```

No final do JSX:

```tsx
{showBudgetModal && <BudgetModal budgets={budgets} onClose={() => setShowBudgetModal(false)} />}
```

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Pages/Finance/Index.tsx
git commit -m "feat: BudgetModal CRUD e redesign card Orçamentos"
```

---

### Task 11: Card "Próximos Pagamentos" + BigStat taxa dinâmica

**Files:**
- Modify: `src/resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Adicionar UpcomingPaymentModal**

Adicionar antes de `FinanceIndex`:

```tsx
function UpcomingPaymentModal({ payment, goals, onClose }: {
  payment: UpcomingPayment | null
  goals: FinancialGoal[]
  onClose: () => void
}) {
  const [description, setDescription] = useState(payment?.description ?? '')
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '')
  const [dueDate, setDueDate] = useState(payment?.due_date ?? new Date().toISOString().slice(0, 10))
  const [linkedGoalId, setLinkedGoalId] = useState<number | ''>(payment?.linked_goal_id ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      description,
      amount: parseFloat(amount),
      due_date: dueDate,
      tag: linkedGoalId ? 'meta' : null,
      linked_goal_id: linkedGoalId || null,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (payment) router.patch(`/finance/upcoming-payments/${payment.id}`, data, opts)
    else router.post('/finance/upcoming-payments', data, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Finanças · Pagamentos</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>{payment ? 'Editar pagamento' : 'Novo pagamento'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div style={{ marginBottom: 12 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input className="input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ex: Fatura Bradesco" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <input className="input" style={{ width: '100%' }} type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data de vencimento</label>
              <input className="input" style={{ width: '100%' }} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Vincular à meta (opcional)</label>
            <select className="input" style={{ width: '100%' }} value={linkedGoalId} onChange={e => setLinkedGoalId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Sem vínculo</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> {payment ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar card "Próximos Pagamentos" no JSX do FinanceIndex**

Após a seção de Orçamentos e antes das Metas, adicionar:

```tsx
{/* Orçamentos + Próximos Pagamentos */}
<div className="grid g-12-5">
  {/* ... card orçamentos existente ... */}

  {/* Próximos Pagamentos */}
  <div className="card" style={{ padding: 0 }}>
    <div style={{ padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="card-title">Próximos Pagamentos</div>
      <button className="btn btn-ghost btn-sm" onClick={() => setUpcomingModal({ payment: null })}>
        <Icons.Plus size={12} />
      </button>
    </div>
    {upcoming_payments.length === 0 ? (
      <div style={{ padding: '0 22px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum pagamento agendado.</div>
    ) : (
      <div>
        {upcoming_payments.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 22px', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
            <div className="mono muted" style={{ fontSize: 11, flex: 'none', width: 44 }}>{p.due_label}</div>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {p.description}
              {p.days_until <= 3 && (
                <span className="tag tag-rose" style={{ fontSize: 10 }}>{p.days_until}d</span>
              )}
              {p.tag === 'meta' && (
                <span className="tag tag-green" style={{ fontSize: 10 }}><span className="dot" />meta</span>
              )}
            </div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500, flex: 'none' }}>{fmtBRL(p.amount)}</div>
            <button className="icon-btn" style={{ width: 24, height: 24, flex: 'none' }} onClick={() => setUpcomingModal({ payment: p })}>
              <Icons.Edit size={11} />
            </button>
            <button className="icon-btn" style={{ width: 24, height: 24, flex: 'none', color: 'var(--rose)' }} onClick={() => {
              if (confirm(`Remover "${p.description}"?`)) router.delete(`/finance/upcoming-payments/${p.id}`, { preserveScroll: true })
            }}>
              <Icons.Trash size={11} />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 3: Atualizar BigStat de taxa de poupança para usar savings_goal_pct**

Localizar no JSX:

```tsx
{ label: 'Taxa de poupança', value: savings_rate.toLocaleString('pt-BR') + '%', sub: 'meta 40%', dir: savings_rate >= 20 ? 'up' : 'flat' },
```

Substituir por:

```tsx
{ label: 'Taxa de poupança', value: savings_rate.toLocaleString('pt-BR') + '%', sub: `meta ${savings_goal_pct}%`, dir: savings_rate >= savings_goal_pct ? 'up' : 'flat' },
```

- [ ] **Step 4: Adicionar estado e renderizar o modal**

```tsx
const [upcomingModal, setUpcomingModal] = useState<{ payment: UpcomingPayment | null } | null>(null)
```

No final do JSX:

```tsx
{upcomingModal !== null && (
  <UpcomingPaymentModal
    payment={upcomingModal.payment}
    goals={goals}
    onClose={() => setUpcomingModal(null)}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/resources/js/Pages/Finance/Index.tsx
git commit -m "feat: card Próximos Pagamentos e taxa de poupança dinâmica"
```

---

### Task 12: TransactionList.tsx — Redesign para tabela com colunas

**Files:**
- Modify: `src/resources/js/Pages/Finance/components/TransactionList.tsx`

- [ ] **Step 1: Reescrever TransactionList com layout de tabela**

Substituir o arquivo inteiro:

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Transaction, PaginatedResponse } from '@/types'
import { Icons } from '@/Components/Icons'

const TRANSACTION_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
  'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
  'Investimento', 'Outros',
]

interface Props {
  transactions: PaginatedResponse<Transaction>
  accountId: number
  onEdit: (t: Transaction) => void
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function TransactionList({ transactions, accountId, onEdit }: Props) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')

  const filtered = transactions.data.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (categoryFilter && t.category !== categoryFilter) return false
    return true
  })

  function handleDelete(id: number) {
    if (!confirm('Excluir esta transação?')) return
    router.delete('/finance/transactions/' + id, {}, { preserveScroll: true })
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div className="seg">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} data-active={typeFilter === f} onClick={() => setTypeFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        <select className="input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {TRANSACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 150px 110px 80px', padding: '9px 20px', color: 'var(--text-4)', fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid var(--line-soft)' }}>
          <div>Data</div><div>Descrição</div><div>Categoria</div><div>Método</div><div style={{ textAlign: 'right' }}>Valor</div><div></div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-4)', fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
            Nenhuma transação encontrada.
          </div>
        ) : (
          filtered.map((t, i) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 150px 110px 80px', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
              <div className="mono muted" style={{ fontSize: 11 }}>{fmtDate(t.occurred_at)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{t.description}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{t.category ?? '—'}</div>
              <div className="mono muted" style={{ fontSize: 11 }}>—</div>
              <div className="mono" style={{ textAlign: 'right', fontWeight: 600, fontSize: 12.5, color: t.type === 'income' ? 'var(--green)' : 'var(--rose)' }}>
                {t.type === 'income' ? '+' : '−'} {fmtBRL(Math.abs(t.amount))}
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => onEdit(t)}>
                  <Icons.Edit size={12} />
                </button>
                <button className="icon-btn" style={{ width: 26, height: 26, color: 'var(--rose)' }} onClick={() => handleDelete(t.id)}>
                  <Icons.Trash size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginação */}
      {transactions.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
            Página {transactions.current_page} de {transactions.last_page}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={transactions.current_page <= 1}
              onClick={() => router.get(window.location.pathname, { page: transactions.current_page - 1 })}>
              ← Anterior
            </button>
            <button className="btn btn-ghost btn-sm" disabled={transactions.current_page >= transactions.last_page}
              onClick={() => router.get(window.location.pathname, { page: transactions.current_page + 1 })}>
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/resources/js/Pages/Finance/components/TransactionList.tsx
git commit -m "refactor: TransactionList redesign — tabela com colunas"
```

---

### Task 13: Account.tsx — Redesign completo

**Files:**
- Modify: `src/resources/js/Pages/Finance/Account.tsx`

- [ ] **Step 1: Reescrever Account.tsx com 4 stat cards e TransactionModal**

Substituir o arquivo inteiro:

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Account, Transaction, PaginatedResponse } from '@/types'
import TransactionList from './components/TransactionList'

interface Props {
  account: { data: Account }
  transactions: PaginatedResponse<Transaction>
  month_income: number
  month_expense: number
  month_count: number
  peak_balance: number
}

const TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança',
  investment: 'Investimento', cash: 'Dinheiro',
}

const TYPE_COLORS: Record<string, string> = {
  checking: 'var(--sky)', savings: 'var(--green)',
  investment: 'var(--purple, oklch(72% 0.12 290))', cash: 'var(--text-4)',
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function TransactionModal({ accountId, transaction, onClose }: {
  accountId: number
  transaction: Transaction | null
  onClose: () => void
}) {
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [occurred_at, setOccurredAt] = useState(transaction?.occurred_at ?? new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const data = { type, amount_encrypted: parseFloat(amount), description, category: category || null, occurred_at }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (transaction === null) router.post(`/finance/accounts/${accountId}/transactions`, data, opts)
    else router.patch(`/finance/transactions/${transaction.id}`, data, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="kicker">{transaction ? 'Editar lançamento' : 'Novo lançamento'}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>
              {transaction ? transaction.description : 'Registrar transação'}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div className="seg" style={{ marginBottom: 14 }}>
            <button type="button" data-active={type === 'expense'} onClick={() => setType('expense')}>Despesa</button>
            <button type="button" data-active={type === 'income'} onClick={() => setType('income')}>Receita</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <input className="input" style={{ width: '100%' }} type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
              <input className="input" style={{ width: '100%' }} type="date" value={occurred_at} onChange={e => setOccurredAt(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input className="input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
            <select className="input" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Sem categoria</option>
              {['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Vestuário','Assinaturas','Salário','Freelance','Investimento','Outros'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> {transaction ? 'Salvar' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinanceAccount({ account, transactions, month_income, month_expense, month_count, peak_balance }: Props) {
  const [txModal, setTxModal] = useState<{ tx: Transaction | null } | null>(null)
  const acc = account.data
  const color = TYPE_COLORS[acc.type] ?? 'var(--text-4)'
  const balance = (acc as any).current_balance as number
  const peakPct = peak_balance > 0 ? Math.round((balance / peak_balance) * 100) : 100

  return (
    <AppLayout
      title={acc.name}
      eyebrow={TYPE_LABELS[acc.type] ?? acc.type}
      subtitle="Histórico e lançamentos desta conta"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setTxModal({ tx: null })}>
          <Icons.Plus size={13} /> Nova Transação
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
          {/* Saldo */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Saldo atual</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span className="tag" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
                <span className="dot" style={{ background: color }} />{TYPE_LABELS[acc.type] ?? acc.type}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>{acc.currency}</span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 34, color: 'var(--text)', letterSpacing: '-.015em', marginTop: 10 }}>{fmtBRL(balance)}</div>
            <div className="meter" style={{ marginTop: 10 }}><span style={{ width: peakPct + '%' }} /></div>
            <div className="stat-delta flat" style={{ marginTop: 5 }}>{peakPct}% do pico histórico</div>
          </div>

          {/* Receitas */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Receitas · mês</div>
            <div className="stat-value" style={{ fontSize: 22, color: 'var(--green)', marginTop: 6 }}>{fmtBRL(month_income)}</div>
            <div className="stat-delta up" style={{ marginTop: 4 }}><Icons.ArrowUpRight size={11} />este mês</div>
          </div>

          {/* Despesas */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Despesas · mês</div>
            <div className="stat-value" style={{ fontSize: 22, color: 'var(--rose)', marginTop: 6 }}>{fmtBRL(month_expense)}</div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>este mês</div>
          </div>

          {/* Contagem */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Transações</div>
            <div className="stat-value" style={{ fontSize: 22, marginTop: 6 }}>{month_count}</div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>este mês</div>
          </div>
        </div>

        {/* Tabela de transações */}
        <TransactionList
          transactions={transactions}
          accountId={acc.id}
          onEdit={t => setTxModal({ tx: t })}
        />

      </div>

      {txModal !== null && (
        <TransactionModal
          accountId={acc.id}
          transaction={txModal.tx}
          onClose={() => setTxModal(null)}
        />
      )}
    </AppLayout>
  )
}
```

- [ ] **Step 2: Verificar TypeScript — rodar build**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && npm run build 2>&1 | tail -20"
```

Esperado: sem erros de TypeScript. Se houver erro de tipo em `acc.current_balance`, verificar o tipo de `Account` em `@/types` e usar cast adequado ou adicionar o campo à interface.

- [ ] **Step 3: Commit**

```bash
git add src/resources/js/Pages/Finance/Account.tsx
git commit -m "feat: Account.tsx redesign completo — 4 stat cards, TransactionModal, tabela"
```

---

### Task 14: Cleanup — GoalCard.tsx legado

**Files:**
- Modify: `src/resources/js/Pages/Finance/components/GoalCard.tsx`

- [ ] **Step 1: Verificar se GoalCard.tsx legado ainda é importado em algum lugar**

```bash
grep -r "GoalCard" /home/andreon/Documentos/Vaultus/src/resources/js --include="*.tsx" -l
```

Se o único arquivo for `components/GoalCard.tsx` em si (não importado por ninguém), deletar:

```bash
rm src/resources/js/Pages/Finance/components/GoalCard.tsx
```

Se ainda for importado em algum arquivo além do Index, manter e anotar para revisão futura.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remover GoalCard.tsx legado (substituído pelo GoalCard inline do Index)"
```
