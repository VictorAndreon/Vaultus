# Finance P1 — Engagement & Behavioral Indicators

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar os 4 indicadores de engajamento que mudam o comportamento financeiro: fundo de emergência rastreado, histórico de patrimônio líquido, transações recorrentes, e alertas de orçamento.

**Pré-requisito:** O plano P0 (`2026-05-15-finance-p0-foundation-fixes.md`) deve estar concluído — este plano depende de `Account.is_liability` e do `net_worth` corrigido.

**Architecture:** (1) Flag `is_emergency_fund` na conta + métrica "meses cobertos" no dashboard. (2) Nova tabela `net_worth_snapshots` preenchida por um Artisan command agendado mensalmente. (3) Flag `is_recurring` + `recurrence_rule` nas transações. (4) Cálculo de alertas de orçamento no `FinanceController`.

**Tech Stack:** Laravel 11, Eloquent, Artisan Commands, Inertia.js, React 18, TypeScript

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `database/migrations/2026_05_15_000003_add_emergency_fund_to_accounts.php` |
| Criar | `database/migrations/2026_05_15_000004_create_net_worth_snapshots_table.php` |
| Criar | `database/migrations/2026_05_15_000005_add_recurring_to_transactions.php` |
| Criar | `app/Domains/Finance/Models/NetWorthSnapshot.php` |
| Criar | `app/Console/Commands/Finance/SnapshotNetWorth.php` |
| Modificar | `app/Domains/Finance/Models/Account.php` |
| Modificar | `app/Domains/Finance/Models/Transaction.php` |
| Modificar | `app/Domains/Finance/Controllers/AccountController.php` |
| Modificar | `app/Domains/Finance/Controllers/FinanceController.php` |
| Modificar | `app/Domains/Finance/Controllers/TransactionController.php` |
| Modificar | `resources/js/Pages/Finance/components/AccountForm.tsx` |
| Modificar | `resources/js/Pages/Finance/components/TransactionForm.tsx` |
| Modificar | `routes/console.php` |
| Criar | `tests/Feature/Finance/EmergencyFundTest.php` |
| Criar | `tests/Feature/Finance/NetWorthSnapshotTest.php` |
| Criar | `tests/Feature/Finance/RecurringTransactionTest.php` |
| Criar | `tests/Feature/Finance/BudgetAlertTest.php` |

---

## Checkpoint 1: Fundo de Emergência

### Task 1: Escrever os testes do fundo de emergência

**Files:**
- Create: `tests/Feature/Finance/EmergencyFundTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmergencyFundTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_can_be_marked_as_emergency_fund()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings', 'balance_encrypted' => 10000]);

        $this->actingAs($user)->patch('/finance/accounts/' . $account->id, [
            'is_emergency_fund' => true,
        ]);

        $this->assertDatabaseHas('accounts', ['id' => $account->id, 'is_emergency_fund' => true]);
    }

    public function test_emergency_months_covered_is_calculated()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create([
            'user_id'           => $user->id,
            'type'              => 'savings',
            'balance_encrypted' => 9000,
            'is_emergency_fund' => true,
        ]);

        // Gasto mensal de R$3.000
        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 3000,
            'description' => 'Aluguel', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        // 9000 de reserva / 3000 de gasto mensal = 3 meses cobertos
        $response->assertInertia(fn ($page) =>
            $page->where('emergency_fund.months_covered', 3.0)
                 ->where('emergency_fund.balance', 9000.0)
                 ->where('emergency_fund.is_adequate', false)  // < 6 meses
        );
    }

    public function test_emergency_fund_is_adequate_when_covers_6_months()
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
            'description' => 'Aluguel', 'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('emergency_fund.months_covered', 6.0)
                 ->where('emergency_fund.is_adequate', true)
        );
    }

    public function test_no_emergency_fund_returns_null()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('emergency_fund', null)
        );
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/EmergencyFundTest.php
```

Esperado: FAIL — `is_emergency_fund` não existe, `emergency_fund` não está nas props.

---

### Task 2: Migration para is_emergency_fund

**Files:**
- Create: `database/migrations/2026_05_15_000003_add_emergency_fund_to_accounts.php`

- [ ] **Step 1: Criar a migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->boolean('is_emergency_fund')->default(false)->after('interest_rate');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn('is_emergency_fund');
        });
    }
};
```

- [ ] **Step 2: Rodar a migration**

```bash
docker compose exec app php artisan migrate
```

---

### Task 3: Atualizar Account model e AccountController

**Files:**
- Modify: `app/Domains/Finance/Models/Account.php`
- Modify: `app/Domains/Finance/Controllers/AccountController.php`

- [ ] **Step 1: Adicionar `is_emergency_fund` ao model**

Em `Account.php`, adicionar ao `$fillable`:

```php
protected $fillable = [
    'user_id', 'name', 'type', 'balance_encrypted', 'currency',
    'credit_limit_encrypted', 'interest_rate', 'is_emergency_fund',
];
```

E ao `casts()`:

```php
'is_emergency_fund' => 'boolean',
```

- [ ] **Step 2: Aceitar `is_emergency_fund` no update do AccountController**

Localizar o método `update()` e alterar o `validate`:

```php
$validated = $request->validate([
    'name'              => 'sometimes|string|max:255',
    'currency'          => 'sometimes|string|size:3',
    'is_emergency_fund' => 'sometimes|boolean',
]);
```

---

### Task 4: Calcular `emergency_fund` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar cálculo antes do return do Inertia**

Inserir após o cálculo de `$upcomingPayments`:

```php
// Fundo de emergência
$emergencyAccount = $accounts->firstWhere('is_emergency_fund', true);
$emergencyFund    = null;

if ($emergencyAccount) {
    $emergencyBalance  = (float) $emergencyAccount->current_balance;
    $avgMonthlyExpense = $monthExpense > 0 ? $monthExpense : null;
    $monthsCovered     = ($avgMonthlyExpense && $avgMonthlyExpense > 0)
        ? round($emergencyBalance / $avgMonthlyExpense, 1)
        : null;

    $emergencyFund = [
        'account_id'     => $emergencyAccount->id,
        'account_name'   => $emergencyAccount->name,
        'balance'        => $emergencyBalance,
        'months_covered' => $monthsCovered,
        'is_adequate'    => $monthsCovered !== null && $monthsCovered >= 6.0,
        'target_months'  => 6,
    ];
}
```

E adicionar à prop do Inertia:

```php
'emergency_fund' => $emergencyFund,
```

---

### Task 5: UI — toggle de fundo de emergência no AccountForm

**Files:**
- Modify: `resources/js/Pages/Finance/components/AccountForm.tsx`

- [ ] **Step 1: Adicionar campo `is_emergency_fund` ao formulário**

Adicionar estado no componente:

```tsx
const [isEmergencyFund, setIsEmergencyFund] = useState(account?.is_emergency_fund ?? false)
```

Incluir no `router.patch` de edição:

```tsx
router.patch('/finance/accounts/' + account.id, { name, currency, is_emergency_fund: isEmergencyFund }, { preserveScroll: true })
```

Adicionar o campo no JSX, logo antes dos botões (visível somente para tipo `savings`):

```tsx
{(account?.type === 'savings' || type === 'savings') && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
            type="checkbox"
            id="emergency_fund"
            checked={isEmergencyFund}
            onChange={e => setIsEmergencyFund(e.target.checked)}
        />
        <label htmlFor="emergency_fund" style={{ fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
            Usar como fundo de emergência
        </label>
    </div>
)}
```

---

### Task 6: Rodar testes e commitar Checkpoint 1

- [ ] **Step 1: Rodar os testes**

```bash
docker compose exec app php artisan test tests/Feature/Finance/EmergencyFundTest.php
```

Esperado: 4 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  database/migrations/2026_05_15_000003_add_emergency_fund_to_accounts.php \
  app/Domains/Finance/Models/Account.php \
  app/Domains/Finance/Controllers/AccountController.php \
  app/Domains/Finance/Controllers/FinanceController.php \
  resources/js/Pages/Finance/components/AccountForm.tsx \
  tests/Feature/Finance/EmergencyFundTest.php

git commit -m "feat: fundo de emergência com indicador de meses cobertos"
```

---

## Checkpoint 2: Histórico de Patrimônio Líquido

### Task 7: Escrever os testes de snapshot

**Files:**
- Create: `tests/Feature/Finance/NetWorthSnapshotTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\NetWorthSnapshot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NetWorthSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_snapshot_command_creates_record_per_user()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        Account::factory()->create(['user_id' => $user1->id, 'type' => 'savings', 'balance_encrypted' => 10000]);
        Account::factory()->create(['user_id' => $user2->id, 'type' => 'checking', 'balance_encrypted' => 5000]);

        $this->artisan('finance:snapshot-net-worth');

        $this->assertDatabaseHas('net_worth_snapshots', [
            'user_id'   => $user1->id,
            'net_worth' => 10000,
        ]);
        $this->assertDatabaseHas('net_worth_snapshots', [
            'user_id'   => $user2->id,
            'net_worth' => 5000,
        ]);
    }

    public function test_snapshot_subtracts_liabilities()
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'savings', 'balance_encrypted' => 20000]);
        Account::factory()->create(['user_id' => $user->id, 'type' => 'credit',  'balance_encrypted' => 5000]);

        $this->artisan('finance:snapshot-net-worth');

        $this->assertDatabaseHas('net_worth_snapshots', [
            'user_id'   => $user->id,
            'net_worth' => 15000,
        ]);
    }

    public function test_snapshot_history_is_passed_to_frontend()
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'savings', 'balance_encrypted' => 10000]);

        // Simular snapshot de meses anteriores
        NetWorthSnapshot::create(['user_id' => $user->id, 'net_worth' => 8000, 'snapped_at' => now()->subMonths(2)->startOfMonth()]);
        NetWorthSnapshot::create(['user_id' => $user->id, 'net_worth' => 9000, 'snapped_at' => now()->subMonths(1)->startOfMonth()]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('net_worth_history')
                 ->has('net_worth_history.labels')
                 ->has('net_worth_history.values')
        );
    }

    public function test_duplicate_snapshot_per_month_is_idempotent()
    {
        $user = User::factory()->create();
        Account::factory()->create(['user_id' => $user->id, 'type' => 'savings', 'balance_encrypted' => 10000]);

        $this->artisan('finance:snapshot-net-worth');
        $this->artisan('finance:snapshot-net-worth');

        $this->assertDatabaseCount('net_worth_snapshots', 1);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/NetWorthSnapshotTest.php
```

Esperado: FAIL — command não existe, tabela não existe.

---

### Task 8: Migration para net_worth_snapshots

**Files:**
- Create: `database/migrations/2026_05_15_000004_create_net_worth_snapshots_table.php`

- [ ] **Step 1: Criar a migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('net_worth_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('net_worth', 15, 2);
            $table->date('snapped_at');
            $table->timestamps();

            $table->unique(['user_id', 'snapped_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('net_worth_snapshots'); }
};
```

- [ ] **Step 2: Rodar a migration**

```bash
docker compose exec app php artisan migrate
```

---

### Task 9: Criar NetWorthSnapshot model

**Files:**
- Create: `app/Domains/Finance/Models/NetWorthSnapshot.php`

- [ ] **Step 1: Criar o model**

```php
<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;

class NetWorthSnapshot extends Model
{
    protected $fillable = ['user_id', 'net_worth', 'snapped_at'];

    protected function casts(): array
    {
        return [
            'net_worth'  => 'float',
            'snapped_at' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

---

### Task 10: Criar o Artisan Command SnapshotNetWorth

**Files:**
- Create: `app/Console/Commands/Finance/SnapshotNetWorth.php`

- [ ] **Step 1: Criar o command**

```php
<?php

namespace App\Console\Commands\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\NetWorthSnapshot;
use Illuminate\Console\Command;

class SnapshotNetWorth extends Command
{
    protected $signature   = 'finance:snapshot-net-worth';
    protected $description = 'Salva o patrimônio líquido de todos os usuários (rodado mensalmente)';

    public function handle(): int
    {
        $today = now()->startOfMonth()->toDateString();

        User::with(['accounts.transactions'])->each(function (User $user) use ($today) {
            $netWorth = (float) $user->accounts->sum(function ($account) {
                $balance = (float) $account->current_balance;
                return $account->is_liability ? -$balance : $balance;
            });

            // updateOrCreate garante idempotência
            NetWorthSnapshot::updateOrCreate(
                ['user_id' => $user->id, 'snapped_at' => $today],
                ['net_worth' => $netWorth]
            );
        });

        $this->info('Snapshots de patrimônio salvos com sucesso.');
        return Command::SUCCESS;
    }
}
```

---

### Task 11: Registrar o command e agendar mensalmente

**Files:**
- Modify: `routes/console.php`

- [ ] **Step 1: Adicionar o agendamento**

Abrir `routes/console.php` e adicionar:

```php
use App\Console\Commands\Finance\SnapshotNetWorth;
use Illuminate\Support\Facades\Schedule;

Schedule::command(SnapshotNetWorth::class)->monthlyOn(1, '00:05');
```

---

### Task 12: Calcular `net_worth_history` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Importar o model e adicionar a consulta**

No topo do controller, após os use existentes:

```php
use App\Domains\Finance\Models\NetWorthSnapshot;
```

Antes do `return Inertia::render(...)`, adicionar:

```php
// Histórico de patrimônio (últimos 12 meses de snapshots)
$ptMonthsAbbr = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
$snapshots = NetWorthSnapshot::where('user_id', $user->id)
    ->orderBy('snapped_at')
    ->limit(24)
    ->get();

$netWorthHistory = [
    'labels' => $snapshots->map(fn($s) => $ptMonthsAbbr[$s->snapped_at->month - 1] . ' ' . $s->snapped_at->year)->toArray(),
    'values' => $snapshots->map(fn($s) => round($s->net_worth, 2))->toArray(),
];
```

E adicionar à prop do Inertia:

```php
'net_worth_history' => $netWorthHistory,
```

---

### Task 13: Rodar testes e commitar Checkpoint 2

- [ ] **Step 1: Rodar os testes**

```bash
docker compose exec app php artisan test tests/Feature/Finance/NetWorthSnapshotTest.php
```

Esperado: 4 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  database/migrations/2026_05_15_000004_create_net_worth_snapshots_table.php \
  app/Domains/Finance/Models/NetWorthSnapshot.php \
  app/Console/Commands/Finance/SnapshotNetWorth.php \
  app/Domains/Finance/Controllers/FinanceController.php \
  routes/console.php \
  tests/Feature/Finance/NetWorthSnapshotTest.php

git commit -m "feat: snapshots mensais de patrimônio líquido com histórico no dashboard"
```

---

## Checkpoint 3: Transações Recorrentes

### Task 14: Escrever os testes de recorrência

**Files:**
- Create: `tests/Feature/Finance/RecurringTransactionTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringTransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_transaction_can_be_marked_as_recurring()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        $response = $this->actingAs($user)->post('/finance/accounts/' . $account->id . '/transactions', [
            'type'             => 'expense',
            'amount_encrypted' => 1500,
            'description'      => 'Aluguel',
            'category'         => 'Moradia',
            'occurred_at'      => '2026-05-01',
            'is_recurring'     => true,
            'recurrence_rule'  => 'monthly',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('transactions', [
            'description'    => 'Aluguel',
            'is_recurring'   => true,
            'recurrence_rule' => 'monthly',
        ]);
    }

    public function test_recurrence_rule_must_be_valid()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        $response = $this->actingAs($user)->post('/finance/accounts/' . $account->id . '/transactions', [
            'type'             => 'expense',
            'amount_encrypted' => 100,
            'description'      => 'Teste',
            'occurred_at'      => '2026-05-01',
            'is_recurring'     => true,
            'recurrence_rule'  => 'invalid-rule',
        ]);

        $response->assertSessionHasErrors('recurrence_rule');
    }

    public function test_recurring_transactions_appear_in_dashboard_list()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);

        $account->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 1500,
            'description'      => 'Aluguel',
            'occurred_at'      => now()->format('Y-m-d'),
            'is_recurring'     => true,
            'recurrence_rule'  => 'monthly',
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('recurring_transactions')
                 ->where('recurring_transactions.0.description', 'Aluguel')
                 ->where('recurring_transactions.0.recurrence_rule', 'monthly')
        );
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/RecurringTransactionTest.php
```

Esperado: FAIL — colunas não existem.

---

### Task 15: Migration para recorrência

**Files:**
- Create: `database/migrations/2026_05_15_000005_add_recurring_to_transactions.php`

- [ ] **Step 1: Criar a migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->boolean('is_recurring')->default(false)->after('occurred_at');
            // Valores: 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
            $table->string('recurrence_rule', 20)->nullable()->after('is_recurring');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['is_recurring', 'recurrence_rule']);
        });
    }
};
```

- [ ] **Step 2: Rodar a migration**

```bash
docker compose exec app php artisan migrate
```

---

### Task 16: Atualizar Transaction model e TransactionController

**Files:**
- Modify: `app/Domains/Finance/Models/Transaction.php`
- Modify: `app/Domains/Finance/Controllers/TransactionController.php`

- [ ] **Step 1: Adicionar ao `$fillable` e `casts()` do model**

Em `Transaction.php`, adicionar ao `$fillable`:

```php
'is_recurring', 'recurrence_rule',
```

E ao `casts()`:

```php
'is_recurring' => 'boolean',
```

- [ ] **Step 2: Aceitar os campos na validação do TransactionController**

No método `store()`, adicionar ao `validate`:

```php
'is_recurring'    => 'sometimes|boolean',
'recurrence_rule' => 'required_if:is_recurring,true|nullable|in:daily,weekly,biweekly,monthly,quarterly,yearly',
```

No método `update()`, adicionar ao `validate`:

```php
'is_recurring'    => 'sometimes|boolean',
'recurrence_rule' => 'nullable|in:daily,weekly,biweekly,monthly,quarterly,yearly',
```

---

### Task 17: Passar `recurring_transactions` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar consulta antes do return**

```php
// Transações recorrentes do usuário
$recurringTransactions = $allTx->where('is_recurring', true)
    ->map(fn($t) => [
        'id'              => $t->id,
        'description'     => $t->description,
        'amount'          => (float) $t->amount_encrypted,
        'type'            => $t->type,
        'category'        => $t->category ?? 'Outros',
        'recurrence_rule' => $t->recurrence_rule,
        'occurred_at'     => \Carbon\Carbon::parse($t->occurred_at)->format('Y-m-d'),
    ])->values()->toArray();
```

E adicionar à prop:

```php
'recurring_transactions' => $recurringTransactions,
```

---

### Task 18: Atualizar TransactionForm com campos de recorrência

**Files:**
- Modify: `resources/js/Pages/Finance/components/TransactionForm.tsx`

- [ ] **Step 1: Adicionar estados e campos no formulário**

Adicionar estados no componente:

```tsx
const [isRecurring, setIsRecurring] = useState(false)
const [recurrenceRule, setRecurrenceRule] = useState<string>('monthly')
```

Incluir no objeto `data` da submissão:

```tsx
...(type !== 'transfer' && {
    is_recurring:    isRecurring,
    recurrence_rule: isRecurring ? recurrenceRule : null,
}),
```

Adicionar campos no JSX (após o campo de data, antes dos botões):

```tsx
{type !== 'transfer' && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
            type="checkbox"
            id="is_recurring"
            checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
        />
        <label htmlFor="is_recurring" style={{ fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
            Recorrente
        </label>
        {isRecurring && (
            <select
                value={recurrenceRule}
                onChange={e => setRecurrenceRule(e.target.value)}
                className="input"
                style={{ width: 140 }}
            >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
            </select>
        )}
    </div>
)}
```

---

### Task 19: Rodar testes e commitar Checkpoint 3

- [ ] **Step 1: Rodar os testes**

```bash
docker compose exec app php artisan test tests/Feature/Finance/RecurringTransactionTest.php
```

Esperado: 3 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  database/migrations/2026_05_15_000005_add_recurring_to_transactions.php \
  app/Domains/Finance/Models/Transaction.php \
  app/Domains/Finance/Controllers/TransactionController.php \
  app/Domains/Finance/Controllers/FinanceController.php \
  resources/js/Pages/Finance/components/TransactionForm.tsx \
  tests/Feature/Finance/RecurringTransactionTest.php

git commit -m "feat: flag de recorrência em transações com regra (mensal, anual, etc.)"
```

---

## Checkpoint 4: Alertas de Orçamento

### Task 20: Escrever os testes de alertas

**Files:**
- Create: `tests/Feature/Finance/BudgetAlertTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\BudgetCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetAlertTest extends TestCase
{
    use RefreshDatabase;

    public function test_budget_alert_is_triggered_when_over_80_percent()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);
        BudgetCategory::factory()->create([
            'user_id' => $user->id,
            'name'    => 'Lazer',
            'budget_amount_encrypted' => 500,
        ]);

        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 420,
            'description' => 'Cinema e restaurantes', 'category' => 'Lazer',
            'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        // 420/500 = 84% — acima do limiar de 80%
        $response->assertInertia(fn ($page) =>
            $page->has('budget_alerts')
                 ->where('budget_alerts.0.category', 'Lazer')
                 ->where('budget_alerts.0.pct', 84)
                 ->where('budget_alerts.0.level', 'warning')
        );
    }

    public function test_budget_alert_is_critical_when_over_100_percent()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);
        BudgetCategory::factory()->create([
            'user_id' => $user->id,
            'name'    => 'Alimentação',
            'budget_amount_encrypted' => 800,
        ]);

        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 920,
            'description' => 'Supermercado', 'category' => 'Alimentação',
            'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('budget_alerts.0.level', 'critical')
        );
    }

    public function test_no_alerts_when_under_80_percent()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 10000]);
        BudgetCategory::factory()->create([
            'user_id' => $user->id,
            'name'    => 'Transporte',
            'budget_amount_encrypted' => 400,
        ]);

        $account->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 200,
            'description' => 'Gasolina', 'category' => 'Transporte',
            'occurred_at' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('budget_alerts', [])
        );
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/BudgetAlertTest.php
```

Esperado: FAIL — `budget_alerts` não existe nas props.

---

### Task 21: Calcular `budget_alerts` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar cálculo antes do return**

Após o cálculo de `$budgets`, adicionar:

```php
// Alertas de orçamento (>= 80% do limite)
$budgetAlerts = collect($budgets)
    ->filter(fn($b) => $b['budget'] > 0 && $b['pct'] >= 80)
    ->map(fn($b) => [
        'category' => $b['name'],
        'spent'    => $b['spent'],
        'budget'   => $b['budget'],
        'pct'      => $b['pct'],
        'level'    => $b['pct'] >= 100 ? 'critical' : 'warning',
    ])
    ->values()
    ->toArray();
```

E adicionar à prop:

```php
'budget_alerts' => $budgetAlerts,
```

---

### Task 22: Rodar testes e commitar Checkpoint 4

- [ ] **Step 1: Rodar os testes de alertas**

```bash
docker compose exec app php artisan test tests/Feature/Finance/BudgetAlertTest.php
```

Esperado: 3 testes passando.

- [ ] **Step 2: Rodar toda a suite do domínio**

```bash
docker compose exec app php artisan test tests/Feature/Finance/
```

Esperado: todos os testes passando.

- [ ] **Step 3: Commitar**

```bash
git add \
  app/Domains/Finance/Controllers/FinanceController.php \
  tests/Feature/Finance/BudgetAlertTest.php

git commit -m "feat: alertas de orçamento (warning >= 80%, critical >= 100%)"
```

---

## Self-Review

**Cobertura da spec P1:**
- ✅ Fundo de emergência com conta marcada e métrica "meses cobertos" (Tasks 1-6)
- ✅ `is_adequate` quando >= 6 meses (Task 4)
- ✅ Net worth history via snapshots mensais agendados (Tasks 7-13)
- ✅ Idempotência do snapshot (Tasks 7, 10)
- ✅ Transações recorrentes com regra de frequência (Tasks 14-19)
- ✅ Alertas de orçamento com níveis `warning`/`critical` (Tasks 20-22)

**Tipos consistentes:**
- `NetWorthSnapshot` criado em Task 9, usado em Tasks 10 e 12 ✅
- `is_recurring`/`recurrence_rule` definidos em Task 15, validados em Task 16, exibidos em Task 18 ✅
- `budget_alerts[].level` definido em Task 21, testado em Tasks 20-22 ✅
