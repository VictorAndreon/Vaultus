# Finance P2 — Advanced Analytics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 4 funcionalidades analíticas avançadas: análise 50/30/20, previsão de fluxo de caixa dos próximos 30 dias, gestão dedicada de assinaturas, e score de saúde financeira.

**Pré-requisito:** Os planos P0 e P1 devem estar concluídos — este plano usa `is_recurring`, `is_emergency_fund`, `NetWorthSnapshot`, e o `net_worth` corrigido.

**Architecture:** Toda a lógica analítica fica no `FinanceController` (cálculos PHP) enviada ao frontend via Inertia. Nenhuma nova tabela é necessária para P2, exceto `subscriptions` para o checkpoint 3. O score de saúde é um cálculo composto de métricas já existentes.

**Tech Stack:** Laravel 11, Eloquent, Inertia.js, React 18, TypeScript

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `database/migrations/2026_05_15_000006_create_subscriptions_table.php` |
| Criar | `app/Domains/Finance/Models/Subscription.php` |
| Criar | `app/Domains/Finance/Controllers/SubscriptionController.php` |
| Modificar | `app/Domains/Finance/Controllers/FinanceController.php` |
| Modificar | `routes/web.php` |
| Criar | `resources/js/Pages/Finance/components/SubscriptionForm.tsx` |
| Criar | `tests/Feature/Finance/BudgetRuleTest.php` |
| Criar | `tests/Feature/Finance/CashFlowForecastTest.php` |
| Criar | `tests/Feature/Finance/SubscriptionTest.php` |
| Criar | `tests/Feature/Finance/FinancialHealthScoreTest.php` |

---

## Checkpoint 1: Análise 50/30/20

### Task 1: Escrever os testes da regra 50/30/20

**Files:**
- Create: `tests/Feature/Finance/BudgetRuleTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetRuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_budget_rule_is_calculated_from_month_income()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        $account->transactions()->create([
            'type' => 'income', 'amount_encrypted' => 5000,
            'description' => 'Salário', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('budget_rule')
                 ->where('budget_rule.income', 5000.0)
                 ->where('budget_rule.needs_target', 2500.0)    // 50% de 5000
                 ->where('budget_rule.wants_target', 1500.0)    // 30% de 5000
                 ->where('budget_rule.savings_target', 1000.0)  // 20% de 5000
        );
    }

    public function test_budget_rule_classifies_needs_wants_savings()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        $account->transactions()->create([
            'type' => 'income', 'amount_encrypted' => 5000,
            'description' => 'Salário', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        // "Necessidades" — categorias essenciais
        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 1500,
            'description' => 'Aluguel', 'category' => 'Moradia', 'occurred_at' => now()->format('Y-m-d'),
        ]);
        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 500,
            'description' => 'Supermercado', 'category' => 'Alimentação', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        // "Desejos"
        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 300,
            'description' => 'Netflix e jogos', 'category' => 'Lazer', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('budget_rule.needs_actual', 2000.0)   // Moradia + Alimentação
                 ->where('budget_rule.wants_actual', 300.0)    // Lazer
        );
    }

    public function test_budget_rule_is_null_when_no_income()
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('budget_rule', null)
        );
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/BudgetRuleTest.php
```

Esperado: FAIL — `budget_rule` não existe nas props.

---

### Task 2: Calcular `budget_rule` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Definir as categorias de necessidades e desejos**

No topo do método `index()`, adicionar as categorias classificadas:

```php
// Categorias mapeadas para a regra 50/30/20
$needsCategories = ['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação'];
$wantsCategories = ['Lazer', 'Vestuário', 'Assinaturas', 'Outros'];
// Categorias de receita/poupança são excluídas dos gastos
```

- [ ] **Step 2: Adicionar cálculo antes do return**

```php
// Regra 50/30/20
$budgetRule = null;
if ($monthIncome > 0) {
    $needsActual   = (float) $monthTx->where('type', 'expense')
        ->whereIn('category', $needsCategories)
        ->sum(fn($t) => (float) $t->amount_encrypted);

    $wantsActual   = (float) $monthTx->where('type', 'expense')
        ->whereIn('category', $wantsCategories)
        ->sum(fn($t) => (float) $t->amount_encrypted);

    $savingsActual = max(0, $monthIncome - $monthExpense);

    $budgetRule = [
        'income'          => round($monthIncome, 2),
        'needs_target'    => round($monthIncome * 0.50, 2),
        'wants_target'    => round($monthIncome * 0.30, 2),
        'savings_target'  => round($monthIncome * 0.20, 2),
        'needs_actual'    => round($needsActual, 2),
        'wants_actual'    => round($wantsActual, 2),
        'savings_actual'  => round($savingsActual, 2),
        'needs_pct'       => (int) round($needsActual / $monthIncome * 100),
        'wants_pct'       => (int) round($wantsActual / $monthIncome * 100),
        'savings_pct'     => (int) round($savingsActual / $monthIncome * 100),
    ];
}
```

E adicionar à prop do Inertia:

```php
'budget_rule' => $budgetRule,
```

---

### Task 3: Rodar testes e commitar Checkpoint 1

- [ ] **Step 1: Rodar os testes**

```bash
docker compose exec app php artisan test tests/Feature/Finance/BudgetRuleTest.php
```

Esperado: 3 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  app/Domains/Finance/Controllers/FinanceController.php \
  tests/Feature/Finance/BudgetRuleTest.php

git commit -m "feat: análise 50/30/20 com necessidades, desejos e poupança reais"
```

---

## Checkpoint 2: Previsão de Fluxo de Caixa

### Task 4: Escrever os testes de previsão

**Files:**
- Create: `tests/Feature/Finance/CashFlowForecastTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\UpcomingPayment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashFlowForecastTest extends TestCase
{
    use RefreshDatabase;

    public function test_forecast_includes_upcoming_payments_as_outflows()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        UpcomingPayment::create([
            'user_id'     => $user->id,
            'description' => 'Aluguel',
            'amount_encrypted' => 2000,
            'due_date'    => now()->addDays(10)->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('cashflow_forecast')
                 ->has('cashflow_forecast.projected_balance')
                 ->where('cashflow_forecast.total_outflows', 2000.0)
        );
    }

    public function test_forecast_projects_balance_after_outflows()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 5000]);

        UpcomingPayment::create([
            'user_id'     => $user->id,
            'description' => 'Fatura cartão',
            'amount_encrypted' => 1500,
            'due_date'    => now()->addDays(15)->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        // 5000 (saldo atual) - 1500 (pagamento) = 3500 projetado
        $response->assertInertia(fn ($page) =>
            $page->where('cashflow_forecast.current_balance', 5000.0)
                 ->where('cashflow_forecast.projected_balance', 3500.0)
        );
    }

    public function test_forecast_includes_recurring_expenses()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 8000]);

        // Transação recorrente mensal
        $account->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 1000,
            'description'      => 'Streaming',
            'category'         => 'Assinaturas',
            'occurred_at'      => now()->subMonths(1)->format('Y-m-d'),
            'is_recurring'     => true,
            'recurrence_rule'  => 'monthly',
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('cashflow_forecast.recurring_outflows')
        );
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/CashFlowForecastTest.php
```

Esperado: FAIL — `cashflow_forecast` não existe.

---

### Task 5: Calcular `cashflow_forecast` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar cálculo antes do return**

```php
// Previsão de fluxo de caixa (próximos 30 dias)
$forecastEnd  = $now->copy()->addDays(30);
$currentLiquidBalance = (float) $accounts
    ->filter(fn($a) => !$a->is_liability && in_array($a->type, ['checking', 'savings', 'cash']))
    ->sum('current_balance');

$forecastPayments = $user->upcomingPayments()
    ->where('due_date', '>=', $now->toDateString())
    ->where('due_date', '<=', $forecastEnd->toDateString())
    ->get();

$totalOutflows = (float) $forecastPayments->sum(fn($p) => (float) $p->amount_encrypted);

// Despesas recorrentes previstas (transações recorrentes mensais não lançadas ainda)
$recurringOutflows = $allTx
    ->where('is_recurring', true)
    ->where('type', 'expense')
    ->where('recurrence_rule', 'monthly')
    ->map(fn($t) => [
        'description' => $t->description,
        'amount'      => (float) $t->amount_encrypted,
        'category'    => $t->category ?? 'Outros',
    ])
    ->values()
    ->toArray();

$totalRecurringOutflows = array_sum(array_column($recurringOutflows, 'amount'));

$cashflowForecast = [
    'current_balance'     => round($currentLiquidBalance, 2),
    'projected_balance'   => round($currentLiquidBalance - $totalOutflows, 2),
    'total_outflows'      => round($totalOutflows, 2),
    'recurring_outflows'  => $recurringOutflows,
    'total_recurring'     => round($totalRecurringOutflows, 2),
    'forecast_days'       => 30,
    'is_negative'         => ($currentLiquidBalance - $totalOutflows) < 0,
];
```

E adicionar à prop:

```php
'cashflow_forecast' => $cashflowForecast,
```

---

### Task 6: Rodar testes e commitar Checkpoint 2

- [ ] **Step 1: Rodar os testes**

```bash
docker compose exec app php artisan test tests/Feature/Finance/CashFlowForecastTest.php
```

Esperado: 3 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  app/Domains/Finance/Controllers/FinanceController.php \
  tests/Feature/Finance/CashFlowForecastTest.php

git commit -m "feat: previsão de fluxo de caixa dos próximos 30 dias"
```

---

## Checkpoint 3: Gestão de Assinaturas

### Task 7: Escrever os testes de assinaturas

**Files:**
- Create: `tests/Feature/Finance/SubscriptionTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Subscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_a_subscription()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/finance/subscriptions', [
            'name'             => 'Netflix',
            'amount_encrypted' => 55.90,
            'billing_cycle'    => 'monthly',
            'next_billing_at'  => now()->addDays(15)->format('Y-m-d'),
            'category'         => 'Lazer',
            'url'              => 'https://netflix.com',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('subscriptions', ['name' => 'Netflix', 'user_id' => $user->id]);
    }

    public function test_can_delete_a_subscription()
    {
        $user         = User::factory()->create();
        $subscription = Subscription::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->delete('/finance/subscriptions/' . $subscription->id);

        $this->assertSoftDeleted('subscriptions', ['id' => $subscription->id]);
    }

    public function test_subscriptions_are_passed_to_dashboard()
    {
        $user = User::factory()->create();
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name'    => 'Spotify',
            'amount_encrypted' => 21.90,
            'billing_cycle'    => 'monthly',
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('subscriptions')
                 ->where('subscriptions.0.name', 'Spotify')
                 ->has('subscriptions_monthly_total')
        );
    }

    public function test_billing_cycle_must_be_valid()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/finance/subscriptions', [
            'name'             => 'Serviço',
            'amount_encrypted' => 10,
            'billing_cycle'    => 'invalid-cycle',
            'next_billing_at'  => now()->addDays(15)->format('Y-m-d'),
        ]);

        $response->assertSessionHasErrors('billing_cycle');
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/SubscriptionTest.php
```

Esperado: FAIL — tabela/model/rotas não existem.

---

### Task 8: Migration para subscriptions

**Files:**
- Create: `database/migrations/2026_05_15_000006_create_subscriptions_table.php`

- [ ] **Step 1: Criar a migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('amount_encrypted');
            // Valores: 'weekly', 'monthly', 'quarterly', 'yearly'
            $table->string('billing_cycle', 15);
            $table->date('next_billing_at');
            $table->string('category', 100)->nullable();
            $table->string('url', 500)->nullable();
            $table->string('notes', 1000)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void { Schema::dropIfExists('subscriptions'); }
};
```

- [ ] **Step 2: Rodar a migration**

```bash
docker compose exec app php artisan migrate
```

---

### Task 9: Criar Subscription model

**Files:**
- Create: `app/Domains/Finance/Models/Subscription.php`

- [ ] **Step 1: Criar o model**

```php
<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subscription extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'amount_encrypted', 'billing_cycle',
        'next_billing_at', 'category', 'url', 'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
            'next_billing_at'  => 'date',
            'is_active'        => 'boolean',
        ];
    }

    // Retorna o custo mensal normalizado independente do ciclo de cobrança
    public function getMonthlyCostAttribute(): float
    {
        $amount = (float) $this->amount_encrypted;
        return match ($this->billing_cycle) {
            'weekly'    => round($amount * 52 / 12, 2),
            'monthly'   => $amount,
            'quarterly' => round($amount / 3, 2),
            'yearly'    => round($amount / 12, 2),
            default     => $amount,
        };
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

---

### Task 10: Criar SubscriptionController

**Files:**
- Create: `app/Domains/Finance/Controllers/SubscriptionController.php`

- [ ] **Step 1: Criar o controller**

```php
<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SubscriptionController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'amount_encrypted' => 'required|numeric|min:0.01',
            'billing_cycle'    => 'required|in:weekly,monthly,quarterly,yearly',
            'next_billing_at'  => 'required|date_format:Y-m-d',
            'category'         => 'nullable|string|max:100',
            'url'              => 'nullable|url|max:500',
            'notes'            => 'nullable|string|max:1000',
        ]);

        $request->user()->subscriptions()->create($validated);

        return back();
    }

    public function update(Request $request, Subscription $subscription)
    {
        abort_if($subscription->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'amount_encrypted' => 'sometimes|numeric|min:0.01',
            'billing_cycle'    => 'sometimes|in:weekly,monthly,quarterly,yearly',
            'next_billing_at'  => 'sometimes|date_format:Y-m-d',
            'category'         => 'nullable|string|max:100',
            'url'              => 'nullable|url|max:500',
            'notes'            => 'nullable|string|max:1000',
            'is_active'        => 'sometimes|boolean',
        ]);

        $subscription->update($validated);

        return back();
    }

    public function destroy(Request $request, Subscription $subscription)
    {
        abort_if($subscription->user_id !== $request->user()->id, 403);

        $subscription->delete();

        return back();
    }
}
```

---

### Task 11: Criar Subscription factory

**Files:**
- Create: `database/factories/Finance/SubscriptionFactory.php`

- [ ] **Step 1: Criar a factory**

```php
<?php

namespace Database\Factories\Finance;

use App\Domains\Finance\Models\Subscription;
use Illuminate\Database\Eloquent\Factories\Factory;

class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    public function definition(): array
    {
        return [
            'user_id'          => 1,
            'name'             => $this->faker->company(),
            'amount_encrypted' => $this->faker->randomFloat(2, 10, 200),
            'billing_cycle'    => $this->faker->randomElement(['monthly', 'yearly']),
            'next_billing_at'  => now()->addDays(rand(1, 30))->format('Y-m-d'),
            'category'         => 'Assinaturas',
            'is_active'        => true,
        ];
    }
}
```

---

### Task 12: Adicionar rotas e user relationship

**Files:**
- Modify: `routes/web.php`
- Modify: `app/Domains/Auth/Models/User.php` (ou onde ficam as relações do usuário)

- [ ] **Step 1: Adicionar rotas de assinaturas**

Em `routes/web.php`, dentro do grupo de rotas de finanças, adicionar após as rotas de wishlist:

```php
Route::post('/finance/subscriptions', [\App\Domains\Finance\Controllers\SubscriptionController::class, 'store']);
Route::patch('/finance/subscriptions/{subscription}', [\App\Domains\Finance\Controllers\SubscriptionController::class, 'update']);
Route::delete('/finance/subscriptions/{subscription}', [\App\Domains\Finance\Controllers\SubscriptionController::class, 'destroy']);
```

- [ ] **Step 2: Adicionar relação subscriptions ao model User**

Localizar o model `User` (provavelmente em `app/Domains/Auth/Models/User.php`) e adicionar:

```php
use App\Domains\Finance\Models\Subscription;

public function subscriptions()
{
    return $this->hasMany(Subscription::class);
}
```

---

### Task 13: Passar subscriptions ao FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar consulta antes do return**

```php
// Assinaturas ativas
$subscriptions = $user->subscriptions()
    ->where('is_active', true)
    ->orderBy('next_billing_at')
    ->get();

$subscriptionsList = $subscriptions->map(fn($s) => [
    'id'               => $s->id,
    'name'             => $s->name,
    'amount'           => (float) $s->amount_encrypted,
    'monthly_cost'     => $s->monthly_cost,
    'billing_cycle'    => $s->billing_cycle,
    'next_billing_at'  => $s->next_billing_at->format('Y-m-d'),
    'category'         => $s->category ?? 'Assinaturas',
    'url'              => $s->url,
])->values()->toArray();

$subscriptionsMonthlyTotal = round(array_sum(array_column($subscriptionsList, 'monthly_cost')), 2);
```

E adicionar às props:

```php
'subscriptions'            => $subscriptionsList,
'subscriptions_monthly_total' => $subscriptionsMonthlyTotal,
```

---

### Task 14: Criar SubscriptionForm.tsx

**Files:**
- Create: `resources/js/Pages/Finance/components/SubscriptionForm.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import CurrencyInput from '@/Components/CurrencyInput'

interface Props {
    onClose: () => void
}

function nextMonthStr() {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
}

export default function SubscriptionForm({ onClose }: Props) {
    const [name, setName] = useState('')
    const [amount, setAmount] = useState<number>(0)
    const [billingCycle, setBillingCycle] = useState<string>('monthly')
    const [nextBillingAt, setNextBillingAt] = useState(nextMonthStr())
    const [category, setCategory] = useState('Assinaturas')
    const [url, setUrl] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        router.post('/finance/subscriptions', {
            name,
            amount_encrypted: amount,
            billing_cycle:    billingCycle,
            next_billing_at:  nextBillingAt,
            category,
            url: url || null,
        }, {
            preserveScroll: true,
            onSuccess: onClose,
        })
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 28, width: '100%', maxWidth: 480, zIndex: 50 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                    Nova assinatura
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Serviço</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="Ex: Netflix" />
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor</label>
                            <CurrencyInput className="input" value={amount} onValueChange={setAmount} required />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Frequência</label>
                            <select value={billingCycle} onChange={e => setBillingCycle(e.target.value)} className="input">
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensal</option>
                                <option value="quarterly">Trimestral</option>
                                <option value="yearly">Anual</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Próxima cobrança</label>
                        <input type="date" value={nextBillingAt} onChange={e => setNextBillingAt(e.target.value)} required className="input" />
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>URL (opcional)</label>
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="input" placeholder="https://..." />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
```

---

### Task 15: Rodar testes e commitar Checkpoint 3

- [ ] **Step 1: Rodar os testes**

```bash
docker compose exec app php artisan test tests/Feature/Finance/SubscriptionTest.php
```

Esperado: 4 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  database/migrations/2026_05_15_000006_create_subscriptions_table.php \
  app/Domains/Finance/Models/Subscription.php \
  app/Domains/Finance/Controllers/SubscriptionController.php \
  app/Domains/Finance/Controllers/FinanceController.php \
  database/factories/Finance/SubscriptionFactory.php \
  resources/js/Pages/Finance/components/SubscriptionForm.tsx \
  routes/web.php \
  tests/Feature/Finance/SubscriptionTest.php

git commit -m "feat: gestão de assinaturas com custo mensal normalizado"
```

---

## Checkpoint 4: Score de Saúde Financeira

### Task 16: Escrever os testes do score

**Files:**
- Create: `tests/Feature/Finance/FinancialHealthScoreTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\NetWorthSnapshot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialHealthScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_score_is_returned_in_dashboard()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('health_score')
                 ->has('health_score.total')
                 ->has('health_score.breakdown')
        );
    }

    public function test_score_increases_with_positive_savings_rate()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        // Receita de R$5000, despesa de R$3000 → savings_rate = 40% (excelente)
        $account->transactions()->create([
            'type' => 'income', 'amount_encrypted' => 5000,
            'description' => 'Salário', 'occurred_at' => now()->format('Y-m-d'),
        ]);
        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 3000,
            'description' => 'Gastos', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        // Score de taxa de poupança deve ser 25 (máximo do critério)
        $response->assertInertia(fn ($page) =>
            $page->where('health_score.breakdown.savings_rate_score', 25)
        );
    }

    public function test_score_has_emergency_fund_component()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create([
            'user_id'           => $user->id,
            'type'              => 'savings',
            'balance_encrypted' => 18000,
            'is_emergency_fund' => true,
        ]);
        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 3000,
            'description' => 'Gastos', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        // Fundo de emergência adequado (>= 6 meses) → 25 pontos
        $response->assertInertia(fn ($page) =>
            $page->where('health_score.breakdown.emergency_fund_score', 25)
        );
    }

    public function test_score_total_is_between_0_and_100()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) => $page->has('health_score.total'));

        $total = $response->inertia()['props']['health_score']['total'];
        $this->assertGreaterThanOrEqual(0, $total);
        $this->assertLessThanOrEqual(100, $total);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/FinancialHealthScoreTest.php
```

Esperado: FAIL — `health_score` não existe nas props.

---

### Task 17: Calcular `health_score` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar cálculo antes do return**

O score é composto por 4 critérios de 0-25 pontos cada (total máximo: 100):

```php
// Score de saúde financeira (0–100)
// Critério 1: Taxa de poupança (0–25 pts)
//   < 0%  → 0 | 0-9%  → 5 | 10-19% → 10 | 20-29% → 20 | >= 30% → 25
$savingsScore = match(true) {
    $savingsRate < 0    => 0,
    $savingsRate < 10   => 5,
    $savingsRate < 20   => 10,
    $savingsRate < 30   => 20,
    default             => 25,
};

// Critério 2: Fundo de emergência (0–25 pts)
//   Sem fundo → 0 | < 1 mês → 5 | 1-3 meses → 10 | 3-6 meses → 18 | >= 6 meses → 25
$efMonths  = $emergencyFund['months_covered'] ?? null;
$efScore   = match(true) {
    $efMonths === null  => 0,
    $efMonths < 1       => 5,
    $efMonths < 3       => 10,
    $efMonths < 6       => 18,
    default             => 25,
};

// Critério 3: Controle de orçamento (0–25 pts)
//   Nenhum orçamento configurado → 0
//   % de categorias dentro do orçamento: >= 100% → 25, >= 80% → 18, >= 60% → 10, < 60% → 0
$budgetScore = 0;
if (count($budgets) > 0) {
    $withinBudget = collect($budgets)->where('pct', '<=', 100)->count();
    $budgetPct    = $withinBudget / count($budgets) * 100;
    $budgetScore  = match(true) {
        $budgetPct >= 100 => 25,
        $budgetPct >= 80  => 18,
        $budgetPct >= 60  => 10,
        default           => 0,
    };
}

// Critério 4: Tendência de patrimônio (0–25 pts)
//   Sem histórico → 0 | Crescendo → 25 | Estável → 15 | Caindo → 5
$trendScore = 0;
if (count($netWorthHistory['values'] ?? []) >= 2) {
    $vals  = $netWorthHistory['values'];
    $first = $vals[0];
    $last  = end($vals);
    $trendScore = match(true) {
        $last > $first * 1.01  => 25, // crescendo mais de 1%
        $last >= $first * 0.99 => 15, // estável (dentro de 1% de variação)
        default                => 5,   // caindo
    };
}

$healthScore = [
    'total'     => min(100, $savingsScore + $efScore + $budgetScore + $trendScore),
    'breakdown' => [
        'savings_rate_score'    => $savingsScore,
        'emergency_fund_score'  => $efScore,
        'budget_control_score'  => $budgetScore,
        'net_worth_trend_score' => $trendScore,
    ],
    'labels' => [
        'savings_rate'    => 'Taxa de poupança',
        'emergency_fund'  => 'Fundo de emergência',
        'budget_control'  => 'Controle de orçamento',
        'net_worth_trend' => 'Tendência patrimonial',
    ],
];
```

E adicionar à prop:

```php
'health_score' => $healthScore,
```

**Atenção:** `$emergencyFund` e `$netWorthHistory` devem ser calculados antes deste bloco (eles foram adicionados nos planos P0 e P1). Verificar a ordem dos blocos no controller.

---

### Task 18: Rodar testes e commitar Checkpoint 4

- [ ] **Step 1: Rodar os testes do score**

```bash
docker compose exec app php artisan test tests/Feature/Finance/FinancialHealthScoreTest.php
```

Esperado: 4 testes passando.

- [ ] **Step 2: Rodar toda a suite de Finance**

```bash
docker compose exec app php artisan test tests/Feature/Finance/
```

Esperado: todos os testes passando (P0 + P1 + P2).

- [ ] **Step 3: Commitar**

```bash
git add \
  app/Domains/Finance/Controllers/FinanceController.php \
  tests/Feature/Finance/FinancialHealthScoreTest.php

git commit -m "feat: score de saúde financeira composto por 4 critérios (0–100 pts)"
```

---

## Self-Review

**Cobertura da spec P2:**
- ✅ Análise 50/30/20 com categorias de necessidades/desejos (Tasks 1-3)
- ✅ `budget_rule` nulo quando sem receita (Tasks 1, 2)
- ✅ Previsão de fluxo de caixa 30 dias (Tasks 4-6)
- ✅ Recorrentes incluídos na previsão (Task 5)
- ✅ `is_negative` flag quando saldo projetado vai a negativo (Task 5)
- ✅ Gestão de assinaturas com custo mensal normalizado por ciclo (Tasks 7-15)
- ✅ Score de saúde financeira 0-100 com 4 critérios (Tasks 16-18)

**Tipos consistentes:**
- `Subscription.monthly_cost` definido em Task 9, usado em Task 13 ✅
- `cashflow_forecast.total_outflows` definido em Task 5, testado em Task 4 ✅
- `health_score.breakdown.savings_rate_score` definido em Task 17, testado em Task 16 ✅
- `emergencyFund` de P1 é reusado em Task 17 sem redeclaração ✅
- `netWorthHistory` de P1 é reusado em Task 17 sem redeclaração ✅

**Dependências declaradas:**
- P2 depende de P0 (Account.is_liability) ✅ documentado no cabeçalho
- P2 depende de P1 (is_emergency_fund, NetWorthSnapshot, is_recurring) ✅ documentado no cabeçalho
