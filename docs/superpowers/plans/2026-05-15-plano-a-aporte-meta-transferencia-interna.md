# Plano A — Aporte de Meta como Transferência Interna

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a inconsistência contábil onde aportar em uma meta cria "dinheiro fantasma" (saldo da meta sobe sem nenhuma conta ser debitada), transformando o aporte em uma transferência interna entre a conta de origem e uma subconta virtual associada à meta.

**Architecture:** Cada `FinancialGoal` ganha uma `Account` virtual (`type='goal'`, `is_internal=true`) criada automaticamente via Model `created` hook. O endpoint `POST /finance/goals/{goal}/deposit` é refatorado para receber um `account_id` de origem e usar a infraestrutura de transferência existente (`createTransferPair`), criando duas transações pareadas. O `current_amount` da meta passa a derivar do `balance` da subconta virtual. Aportes legados (TransactionGoal sem transaction_id) são migrados via script idempotente que vincula cada um à conta padrão do usuário ou marca como "órfãos a reconciliar".

**Tech Stack:** Laravel 11, Eloquent, Inertia.js, React 18, TypeScript, PHPUnit

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `database/migrations/2026_05_16_000001_add_is_internal_and_goal_id_to_accounts.php` |
| Criar | `database/migrations/2026_05_16_000002_backfill_goal_virtual_accounts.php` |
| Modificar | `app/Domains/Finance/Models/Account.php` |
| Modificar | `app/Domains/Finance/Models/FinancialGoal.php` |
| Modificar | `app/Domains/Finance/Models/Transaction.php` |
| Modificar | `app/Domains/Finance/Controllers/GoalController.php` |
| Modificar | `app/Domains/Finance/Controllers/FinanceController.php` |
| Modificar | `app/Domains/Finance/Controllers/AccountController.php` |
| Criar | `app/Domains/Finance/Services/GoalDepositService.php` |
| Modificar | `resources/js/Pages/Finance/Index.tsx` |
| Modificar | `resources/js/types/index.d.ts` (ou onde tipos vivem) |
| Criar | `tests/Feature/Finance/GoalVirtualAccountTest.php` |
| Criar | `tests/Feature/Finance/GoalDepositAsTransferTest.php` |
| Modificar | `tests/Feature/Finance/GoalTest.php` |
| Modificar | `tests/Feature/Finance/TransactionGoalTest.php` |
| Modificar | `database/factories/AccountFactory.php` |

---

## Checkpoint 1: Subconta Virtual da Meta

### Task 1: Escrever teste de criação automática da subconta virtual

**Files:**
- Create: `tests/Feature/Finance/GoalVirtualAccountTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalVirtualAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_goal_creates_virtual_account()
    {
        $user = User::factory()->create();

        $goal = $user->financialGoals()->create([
            'name'                    => 'Reserva de Emergência',
            'target_amount_encrypted' => 10000,
        ]);

        $virtual = Account::where('goal_id', $goal->id)->first();

        $this->assertNotNull($virtual);
        $this->assertSame('goal', $virtual->type);
        $this->assertTrue((bool) $virtual->is_internal);
        $this->assertSame($user->id, $virtual->user_id);
        $this->assertSame($goal->name, $virtual->name);
    }

    public function test_virtual_accounts_are_hidden_from_user_account_list()
    {
        $user = User::factory()->create();

        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->financialGoals()->create([
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 5000,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('accounts_list', 1)
        );
    }

    public function test_deleting_goal_also_deletes_virtual_account()
    {
        $user = User::factory()->create();

        $goal = $user->financialGoals()->create([
            'name'                    => 'Carro',
            'target_amount_encrypted' => 30000,
        ]);

        $virtualId = Account::where('goal_id', $goal->id)->value('id');

        $goal->delete();

        $this->assertSoftDeleted('accounts', ['id' => $virtualId]);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=GoalVirtualAccountTest`
Expected: FAIL — coluna `goal_id` não existe em `accounts`.

---

### Task 2: Criar migration adicionando `is_internal` e `goal_id` em accounts

**Files:**
- Create: `database/migrations/2026_05_16_000001_add_is_internal_and_goal_id_to_accounts.php`

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
            $table->boolean('is_internal')->default(false)->after('currency');
            $table->foreignId('goal_id')
                ->nullable()
                ->after('is_internal')
                ->constrained('financial_goals')
                ->nullOnDelete();

            $table->index(['user_id', 'is_internal']);
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'is_internal']);
            $table->dropConstrainedForeignId('goal_id');
            $table->dropColumn('is_internal');
        });
    }
};
```

- [ ] **Step 2: Rodar a migration**

Run: `docker compose exec app php artisan migrate`
Expected: `Migrated: 2026_05_16_000001_add_is_internal_and_goal_id_to_accounts`

---

### Task 3: Atualizar `Account` model com tipo `goal` e scope para excluir internas

**Files:**
- Modify: `app/Domains/Finance/Models/Account.php`

- [ ] **Step 1: Substituir o conteúdo completo do model**

```php
<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Database\Factories\AccountFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory(): AccountFactory
    {
        return AccountFactory::new();
    }

    protected $fillable = [
        'user_id', 'name', 'type', 'balance_encrypted', 'currency',
        'credit_limit_encrypted', 'interest_rate',
        'is_internal', 'goal_id',
    ];

    public const LIABILITY_TYPES = ['credit', 'loan'];
    public const VISIBLE_TYPES   = ['checking', 'savings', 'investment', 'cash', 'credit', 'loan'];

    protected function casts(): array
    {
        return [
            'balance_encrypted'      => EncryptedCast::class,
            'credit_limit_encrypted' => EncryptedCast::class,
            'interest_rate'          => 'float',
            'is_internal'            => 'boolean',
        ];
    }

    public function scopeUserVisible(Builder $q): Builder
    {
        return $q->where('is_internal', false);
    }

    public function scopeInternalGoalAccounts(Builder $q): Builder
    {
        return $q->where('is_internal', true)->whereNotNull('goal_id');
    }

    public function getIsLiabilityAttribute(): bool
    {
        return in_array($this->type, self::LIABILITY_TYPES);
    }

    public function getCurrentBalanceAttribute(): float
    {
        $transactions = $this->relationLoaded('transactions')
            ? $this->transactions
            : $this->transactions()->get();

        $income  = $transactions->whereIn('type', ['income'])->sum(fn($t) => (float) $t->amount_encrypted);
        $expense = $transactions->whereIn('type', ['expense'])->sum(fn($t) => (float) $t->amount_encrypted);

        $transferOut = $transactions->where('type', 'transfer')
            ->filter(fn($t) => !is_null($t->transfer_to_account_id))
            ->sum(fn($t) => (float) $t->amount_encrypted);

        $transferIn = $transactions->where('type', 'transfer')
            ->filter(fn($t) => is_null($t->transfer_to_account_id))
            ->sum(fn($t) => (float) $t->amount_encrypted);

        $base = (float) ($this->balance_encrypted ?? 0);

        if ($this->is_liability) {
            return $base + $expense - $income - $transferIn + $transferOut;
        }

        return $base + $income - $expense + $transferIn - $transferOut;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function goal()
    {
        return $this->belongsTo(FinancialGoal::class, 'goal_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
```

- [ ] **Step 2: Verificar que tipos de conta visíveis NÃO incluem `goal`**

O tipo `goal` é interno. Não deve aparecer em `VISIBLE_TYPES` (é a constante usada pelas validações do `AccountController`).

---

### Task 4: Adicionar hook no `FinancialGoal` que cria/apaga subconta automaticamente

**Files:**
- Modify: `app/Domains/Finance/Models/FinancialGoal.php`

- [ ] **Step 1: Substituir o método `booted()` e adicionar `virtualAccount()`**

```php
protected static function booted(): void
{
    static::creating(function (FinancialGoal $goal) {
        if ($goal->getRawOriginal('current_amount_encrypted') === null) {
            $goal->current_amount_encrypted = '0';
        }
    });

    static::created(function (FinancialGoal $goal) {
        \App\Domains\Finance\Models\Account::create([
            'user_id'           => $goal->user_id,
            'name'              => $goal->name,
            'type'              => 'goal',
            'balance_encrypted' => 0,
            'currency'          => 'BRL',
            'is_internal'       => true,
            'goal_id'           => $goal->id,
        ]);
    });

    static::updated(function (FinancialGoal $goal) {
        if ($goal->wasChanged('name') && $goal->virtualAccount) {
            $goal->virtualAccount->update(['name' => $goal->name]);
        }
    });

    static::deleting(function (FinancialGoal $goal) {
        $goal->virtualAccount?->delete();
    });
}

public function virtualAccount()
{
    return $this->hasOne(\App\Domains\Finance\Models\Account::class, 'goal_id');
}
```

- [ ] **Step 2: Rodar os testes do Checkpoint 1**

Run: `docker compose exec app php artisan test --filter=GoalVirtualAccountTest`
Expected: All tests PASS.

---

### Task 5: Excluir contas internas do `accounts_list` exposto ao frontend

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Alterar a linha 19 para usar o scope `userVisible`**

Trocar:
```php
$accounts = $user->accounts()->with('transactions')->get();
```

Por:
```php
$accounts = $user->accounts()->userVisible()->with('transactions')->get();
```

- [ ] **Step 2: Rodar todos os testes de Account e Goal**

Run: `docker compose exec app php artisan test --filter='AccountTest|GoalTest|GoalVirtualAccountTest'`
Expected: All tests PASS.

---

### Task 6: Commitar Checkpoint 1

- [ ] **Step 1: Commitar**

```bash
git add database/migrations/2026_05_16_000001_add_is_internal_and_goal_id_to_accounts.php \
        app/Domains/Finance/Models/Account.php \
        app/Domains/Finance/Models/FinancialGoal.php \
        app/Domains/Finance/Controllers/FinanceController.php \
        tests/Feature/Finance/GoalVirtualAccountTest.php
git commit -m "feat(finance): subconta virtual associada a cada meta"
```

---

## Checkpoint 2: Aporte como Transferência

### Task 7: Escrever teste de aporte virando transferência

**Files:**
- Create: `tests/Feature/Finance/GoalDepositAsTransferTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalDepositAsTransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_deposit_creates_transfer_pair()
    {
        $user    = User::factory()->create();
        $source  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal    = $user->financialGoals()->create([
            'name'                    => 'Reserva',
            'target_amount_encrypted' => 10000,
        ]);
        $virtual = $goal->virtualAccount;

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 500,
            'account_id' => $source->id,
        ]);

        $this->assertDatabaseHas('transactions', [
            'account_id'             => $source->id,
            'type'                   => 'transfer',
            'transfer_to_account_id' => $virtual->id,
        ]);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $virtual->id,
            'type'       => 'transfer',
        ]);
    }

    public function test_deposit_preserves_net_worth()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 3000,
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 800,
            'account_id' => $source->id,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('net_worth', 5000.0)
        );
    }

    public function test_deposit_increases_goal_current_amount()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Carro',
            'target_amount_encrypted' => 30000,
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 1200,
            'account_id' => $source->id,
        ]);

        $this->assertSame(1200.0, (float) $goal->fresh()->current_amount);
    }

    public function test_deposit_requires_account_id()
    {
        $user = User::factory()->create();
        $goal = $user->financialGoals()->create([
            'name'                    => 'Sem origem',
            'target_amount_encrypted' => 1000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/finance/goals/{$goal->id}/deposit", ['amount' => 100]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('account_id');
    }

    public function test_deposit_from_another_users_account_is_forbidden()
    {
        $user1  = User::factory()->create();
        $user2  = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user2->id, 'type' => 'checking']);
        $goal   = $user1->financialGoals()->create([
            'name'                    => 'Privada',
            'target_amount_encrypted' => 5000,
        ]);

        $response = $this->actingAs($user1)
            ->postJson("/finance/goals/{$goal->id}/deposit", [
                'amount'     => 100,
                'account_id' => $source->id,
            ]);

        $response->assertStatus(422);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=GoalDepositAsTransferTest`
Expected: FAIL — endpoint ainda não exige `account_id`.

---

### Task 8: Criar `GoalDepositService` encapsulando a lógica

**Files:**
- Create: `app/Domains/Finance/Services/GoalDepositService.php`

- [ ] **Step 1: Criar o serviço**

```php
<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Support\Facades\DB;

class GoalDepositService
{
    public function deposit(FinancialGoal $goal, Account $source, float $amount, ?string $occurredAt = null, ?string $note = null): Transaction
    {
        if ($source->user_id !== $goal->user_id) {
            abort(422, 'Conta de origem não pertence ao dono da meta.');
        }

        if ($source->is_internal) {
            abort(422, 'Conta de origem não pode ser uma subconta interna.');
        }

        $virtual = $goal->virtualAccount;
        abort_if($virtual === null, 500, 'Meta sem subconta virtual associada.');

        return DB::transaction(function () use ($source, $virtual, $amount, $occurredAt, $note) {
            $date = $occurredAt ?? now()->toDateString();

            $shared = [
                'type'             => 'transfer',
                'amount_encrypted' => $amount,
                'description'      => $note ?? 'Aporte para meta',
                'occurred_at'      => $date,
                'category'         => null,
            ];

            $outgoing = $source->transactions()->create(array_merge($shared, [
                'transfer_to_account_id' => $virtual->id,
            ]));

            $incoming = $virtual->transactions()->create(array_merge($shared, [
                'transfer_pair_id' => $outgoing->id,
            ]));

            $outgoing->update(['transfer_pair_id' => $incoming->id]);

            return $outgoing;
        });
    }
}
```

---

### Task 9: Refatorar `GoalController::deposit` para usar o serviço

**Files:**
- Modify: `app/Domains/Finance/Controllers/GoalController.php`

- [ ] **Step 1: Substituir o método `deposit` (linhas 90-105)**

```php
public function deposit(Request $request, FinancialGoal $goal, \App\Domains\Finance\Services\GoalDepositService $service)
{
    abort_if($goal->user_id !== $request->user()->id, 403);

    $data = $request->validate([
        'amount'      => 'required|numeric|min:0.01',
        'account_id'  => 'required|integer|exists:accounts,id',
        'occurred_at' => 'nullable|date_format:Y-m-d',
        'note'        => 'nullable|string|max:255',
    ]);

    $source = \App\Domains\Finance\Models\Account::findOrFail($data['account_id']);
    abort_if($source->user_id !== $request->user()->id, 422, 'Conta de origem inválida.');

    $service->deposit(
        goal:       $goal,
        source:     $source,
        amount:     (float) $data['amount'],
        occurredAt: $data['occurred_at'] ?? null,
        note:       $data['note']        ?? null,
    );

    return back();
}
```

- [ ] **Step 2: Rodar os testes do Checkpoint 2**

Run: `docker compose exec app php artisan test --filter=GoalDepositAsTransferTest`
Expected: All tests PASS.

---

### Task 10: Atualizar `FinancialGoal::current_amount` para derivar da subconta

**Files:**
- Modify: `app/Domains/Finance/Models/FinancialGoal.php`

- [ ] **Step 1: Substituir o accessor `getCurrentAmountAttribute`**

```php
public function getCurrentAmountAttribute(): float
{
    return (float) ($this->virtualAccount?->current_balance ?? 0);
}
```

- [ ] **Step 2: Rodar suite completa de Finance para regressão**

Run: `docker compose exec app php artisan test --testsuite=Feature --filter=Finance`
Expected: All tests PASS. Se algum teste de `TransactionGoalTest` falhar, é esperado — será migrado no Checkpoint 3.

---

### Task 11: Commitar Checkpoint 2

- [ ] **Step 1: Commitar**

```bash
git add app/Domains/Finance/Services/GoalDepositService.php \
        app/Domains/Finance/Controllers/GoalController.php \
        app/Domains/Finance/Models/FinancialGoal.php \
        tests/Feature/Finance/GoalDepositAsTransferTest.php
git commit -m "feat(finance): aporte de meta vira transferência interna"
```

---

## Checkpoint 3: Migração dos Dados Legados

### Task 12: Escrever teste de migração de aportes legados

**Files:**
- Modify: `tests/Feature/Finance/TransactionGoalTest.php`

- [ ] **Step 1: Adicionar teste de migração ao final do arquivo**

```php
public function test_legacy_transaction_goal_deposits_are_migrated_to_transfers(): void
{
    $user     = User::factory()->create();
    $checking = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
    $goal     = $user->financialGoals()->create([
        'name'                    => 'Legado',
        'target_amount_encrypted' => 10000,
    ]);
    $virtual = $goal->virtualAccount;

    // Simula aporte legado: TransactionGoal sem transaction_id
    \DB::table('transaction_goal')->insert([
        'financial_goal_id' => $goal->id,
        'transaction_id'    => null,
        'amount_encrypted'  => encrypt('300'),
        'occurred_at'       => '2026-04-01',
        'note'              => 'Aporte manual legado',
        'created_at'        => now(),
        'updated_at'        => now(),
    ]);

    \Artisan::call('migrate', ['--path' => 'database/migrations/2026_05_16_000002_backfill_goal_virtual_accounts.php', '--force' => true]);

    // Após migração: existem 2 transações de transfer entre checking e virtual
    $this->assertDatabaseHas('transactions', [
        'account_id'             => $checking->id,
        'type'                   => 'transfer',
        'transfer_to_account_id' => $virtual->id,
    ]);

    // E o TransactionGoal legado foi removido (ou marcado como migrated)
    $this->assertDatabaseMissing('transaction_goal', [
        'financial_goal_id' => $goal->id,
        'transaction_id'    => null,
    ]);
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=test_legacy_transaction_goal_deposits_are_migrated_to_transfers`
Expected: FAIL — migration ainda não existe.

---

### Task 13: Criar migration de backfill

**Files:**
- Create: `database/migrations/2026_05_16_000002_backfill_goal_virtual_accounts.php`

- [ ] **Step 1: Criar a migration**

```php
<?php

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Garantir que toda meta tem subconta virtual (idempotente).
        FinancialGoal::withoutGlobalScopes()->each(function (FinancialGoal $goal) {
            if ($goal->virtualAccount) return;
            Account::create([
                'user_id'           => $goal->user_id,
                'name'              => $goal->name,
                'type'              => 'goal',
                'balance_encrypted' => 0,
                'currency'          => 'BRL',
                'is_internal'       => true,
                'goal_id'           => $goal->id,
            ]);
        });

        // 2. Migrar TransactionGoals legados (transaction_id IS NULL):
        //    Converter em transfer da conta padrão (primeira não-internal) para a subconta.
        DB::table('transaction_goal')->whereNull('transaction_id')->orderBy('id')->each(function ($row) {
            $goal = FinancialGoal::find($row->financial_goal_id);
            if (! $goal || ! $goal->virtualAccount) return;

            $source = Account::where('user_id', $goal->user_id)
                ->where('is_internal', false)
                ->orderBy('id')
                ->first();

            if (! $source) {
                // Sem conta de origem: pula. Aparecerá em relatório de inconsistências (a criar separadamente).
                return;
            }

            $amount = (float) decrypt($row->amount_encrypted);

            DB::transaction(function () use ($source, $goal, $row, $amount) {
                $shared = [
                    'account_id'       => $source->id,
                    'type'             => 'transfer',
                    'amount_encrypted' => encrypt((string) $amount),
                    'description'      => $row->note ?? 'Aporte migrado',
                    'category'         => null,
                    'occurred_at'      => $row->occurred_at ?? now()->toDateString(),
                    'created_at'       => $row->created_at,
                    'updated_at'       => $row->updated_at,
                ];

                $outgoing = Transaction::create(array_merge($shared, [
                    'transfer_to_account_id' => $goal->virtualAccount->id,
                ]));

                $incoming = Transaction::create(array_merge($shared, [
                    'account_id'       => $goal->virtualAccount->id,
                    'transfer_pair_id' => $outgoing->id,
                ]));

                $outgoing->update(['transfer_pair_id' => $incoming->id]);
            });

            DB::table('transaction_goal')->where('id', $row->id)->delete();
        });
    }

    public function down(): void
    {
        // Não revertemos automaticamente. Para reverter manualmente:
        //   - apagar transactions de type=transfer ligadas a accounts com is_internal=true
        //   - apagar accounts onde is_internal=true
        // Aportes legados não são restaurados.
    }
};
```

- [ ] **Step 2: Rodar a migration**

Run: `docker compose exec app php artisan migrate`
Expected: `Migrated: 2026_05_16_000002_backfill_goal_virtual_accounts`

- [ ] **Step 3: Rodar o teste do passo 12**

Run: `docker compose exec app php artisan test --filter=test_legacy_transaction_goal_deposits_are_migrated_to_transfers`
Expected: PASS.

---

### Task 14: Remover renderização de `goal_deposits` no `FinanceController`

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Excluir o bloco `$goalDeposits` (linhas 99-112)**

Remover completamente:
```php
// Aportes manuais de metas (transaction_id IS NULL = depósito sem transação vinculada)
$goalDeposits = $user->financialGoals()
    ->with(['transactionGoals' => fn($q) => $q->whereNull('transaction_id')])
    ->get()
    ->flatMap(fn($g) => $g->transactionGoals->map(fn($tg) => [...]));
```

- [ ] **Step 2: Ajustar `$recentTx` (linhas 115-129) para remover `->concat($goalDeposits)`**

Trocar:
```php
$recentTx = $allTx->map(fn($t) => [...])
    ->concat($goalDeposits)
    ->sortByDesc('occurred_ts')
    ->take(8)
    ->map(fn($t) => collect($t)->except('occurred_ts')->all())
    ->values()->toArray();
```

Por:
```php
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
    ->sortByDesc('occurred_ts')
    ->take(8)
    ->map(fn($t) => collect($t)->except('occurred_ts')->all())
    ->values()->toArray();
```

---

### Task 15: Commitar Checkpoint 3

- [ ] **Step 1: Rodar suite completa**

Run: `docker compose exec app php artisan test`
Expected: All PASS.

- [ ] **Step 2: Commitar**

```bash
git add database/migrations/2026_05_16_000002_backfill_goal_virtual_accounts.php \
        app/Domains/Finance/Controllers/FinanceController.php \
        tests/Feature/Finance/TransactionGoalTest.php
git commit -m "feat(finance): backfill subcontas e migrar aportes legados para transferências"
```

---

## Checkpoint 4: Frontend — Aporte com origem obrigatória

### Task 16: Atualizar `AporteModal` para incluir seletor de conta

**Files:**
- Modify: `resources/js/Pages/Finance/Index.tsx` (linhas 296-317 — o `AporteModal`)

- [ ] **Step 1: Substituir o componente `AporteModal` completo**

Localize a função `AporteModal` (linha ~296) e substitua todo o bloco por:

```tsx
function AporteModal({
  goal,
  accounts,
  onClose,
  onSave,
}: {
  goal: FinancialGoal
  accounts: AccountItem[]
  onClose: () => void
  onSave: (v: { amount: number; accountId: number }) => void
}) {
  const externalAccounts = accounts.filter(a => a.type !== 'goal')
  const [amount, setAmount] = useState(goal.monthly_amount > 0 ? goal.monthly_amount : 0)
  const [accountId, setAccountId] = useState<number | ''>(externalAccounts[0]?.id ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (amount > 0 && accountId !== '') onSave({ amount, accountId: Number(accountId) })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Aportar · {goal.name}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Registrar aporte</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '22px 26px' }}>
          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>De qual conta?</label>
          <select
            className="input"
            style={{ width: '100%', marginBottom: 16 }}
            value={accountId}
            onChange={e => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}
            required
          >
            <option value="">Selecionar conta de origem</option>
            {externalAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Valor do aporte (R$)</label>
          <CurrencyInput
            value={amount}
            onValueChange={setAmount}
            autoFocus
            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--mono)' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={accountId === '' || amount <= 0}>
              <Icons.Check size={13} /> Confirmar aporte
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

### Task 17: Atualizar o callback `handleAporte` no `FinanceIndex`

**Files:**
- Modify: `resources/js/Pages/Finance/Index.tsx` (linhas 760-765)

- [ ] **Step 1: Substituir o callback**

Localize a função `handleAporte` (linha ~760) e substitua por:

```tsx
function handleAporte({ amount, accountId }: { amount: number; accountId: number }) {
  if (!aporteGoal) return
  router.post(
    `/finance/goals/${aporteGoal.id}/deposit`,
    { amount, account_id: accountId },
    { preserveScroll: true, onSuccess: () => setAporteGoal(null) }
  )
}
```

- [ ] **Step 2: Atualizar a renderização do modal (linha ~1024)**

Trocar:
```tsx
{aporteGoal && <AporteModal goal={aporteGoal} onClose={() => setAporteGoal(null)} onSave={handleAporte} />}
```

Por:
```tsx
{aporteGoal && <AporteModal goal={aporteGoal} accounts={accounts_list} onClose={() => setAporteGoal(null)} onSave={handleAporte} />}
```

---

### Task 18: Atualizar renderização da tabela para suportar `type='transfer'`

**Files:**
- Modify: `resources/js/Pages/Finance/Index.tsx` (linhas 1005-1015)

- [ ] **Step 1: Substituir a renderização do valor (linha 1011-1013)**

Trocar:
```tsx
<div className="mono" style={{ textAlign: 'right', color: t.type === 'income' ? 'var(--success)' : 'var(--text)', fontWeight: 500 }}>
  {t.type === 'income' ? '+' : '−'} {fmtBRL(Math.abs(t.amount))}
</div>
```

Por:
```tsx
{(() => {
  const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔'
  const color = t.type === 'income' ? 'var(--success)' : t.type === 'expense' ? 'var(--rose)' : 'var(--text-3)'
  return (
    <div className="mono" style={{ textAlign: 'right', color, fontWeight: 500 }}>
      {sign} {fmtBRL(Math.abs(t.amount))}
    </div>
  )
})()}
```

- [ ] **Step 2: Atualizar a interface `FinanceTransaction` (linha 22)**

Trocar:
```tsx
interface FinanceTransaction { id: number; date: string; description: string; category: string; method: string; amount: number; type: 'income' | 'expense' }
```

Por:
```tsx
interface FinanceTransaction {
  id: number
  date: string
  description: string
  category: string
  method: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
}
```

---

### Task 19: Verificar no navegador

- [ ] **Step 1: Subir o ambiente**

Run: `docker compose up -d && docker compose exec app npm run dev`

- [ ] **Step 2: Smoke test manual em `https://vaultus.local/finance`**

Verificar:
- (a) Criar meta nova → subconta NÃO aparece na lista de contas do dashboard.
- (b) Clicar "Aportar" em uma meta → modal pede conta de origem.
- (c) Confirmar aporte → patrimônio líquido NÃO muda; saldo da meta sobe.
- (d) Na tabela "Lançamentos recentes" → o aporte aparece com seta dupla (`↔`) e cor neutra.

- [ ] **Step 3: Se algo falhar, voltar à Task que pertence o componente quebrado.**

---

### Task 20: Commitar Checkpoint 4

- [ ] **Step 1: Commitar**

```bash
git add resources/js/Pages/Finance/Index.tsx
git commit -m "feat(finance): UI de aporte com conta de origem obrigatória"
```

---

## Checkpoint 5: Limpeza e regressão

### Task 21: Atualizar `AccountFactory` para suportar tipo `goal`

**Files:**
- Modify: `database/factories/AccountFactory.php`

- [ ] **Step 1: Adicionar state `goalAccount()`**

```php
public function goalAccount(): static
{
    return $this->state(fn () => [
        'type'        => 'goal',
        'is_internal' => true,
    ]);
}
```

---

### Task 22: Marcar `TransactionGoal` como deprecated

**Files:**
- Modify: `app/Domains/Finance/Models/TransactionGoal.php`

- [ ] **Step 1: Adicionar PHPDoc de deprecação**

```php
/**
 * @deprecated Os aportes de meta agora são modelados como transferências
 *             entre conta corrente e subconta virtual da meta. Esta entidade
 *             permanece apenas para histórico anterior à migração 2026_05_16.
 *             Não criar novos registros aqui.
 */
class TransactionGoal extends Model
{
    // ... resto idêntico
}
```

- [ ] **Step 2: Manter `TransactionGoalController` por enquanto, mas remover rota de `store`**

**Files:**
- Modify: `routes/web.php`

Remover ou comentar as duas linhas:
```php
Route::post('/finance/transactions/{transaction}/allocations', [TransactionGoalController::class, 'store']);
Route::delete('/finance/allocations/{allocation}', [TransactionGoalController::class, 'destroy']);
```

---

### Task 23: Rodar suite inteira e auditar regressões

- [ ] **Step 1: Rodar tudo**

Run: `docker compose exec app php artisan test`
Expected: All tests PASS. Se algum teste de `TransactionGoalTest` referente a `store` falhar, ajustar para refletir o novo modelo (deletar o teste ou trocar para `GoalDepositAsTransferTest`).

- [ ] **Step 2: Smoke test final no navegador**

Verificar:
- Criar conta, criar meta, fazer aporte, excluir meta (subconta some), excluir transferência (par some), excluir conta de origem (transferências viram órfãs).

---

### Task 24: Commitar Checkpoint 5

- [ ] **Step 1: Commitar**

```bash
git add database/factories/AccountFactory.php \
        app/Domains/Finance/Models/TransactionGoal.php \
        routes/web.php
git commit -m "chore(finance): deprecar TransactionGoal e ajustar factory para subconta virtual"
```

---

## Critérios de Conclusão

- [ ] Todos os testes passam (`php artisan test`).
- [ ] Smoke test manual no navegador confirma os 4 cenários da Task 19.
- [ ] Não há mais chamadas a `TransactionGoal::create()` no código de produção (grep deve retornar zero — apenas no service migrado e no histórico).
- [ ] `git log` mostra 5 commits limpos correspondendo aos 5 checkpoints.

## Riscos & Mitigações

| Risco | Mitigação |
|-------|-----------|
| Aporte legado sem conta de origem detectável | Migration salta esses registros (não force-cria transferência fake). Criar comando `php artisan finance:reconcile-orphan-deposits` em plano futuro. |
| Hook `created` do FinancialGoal falhar silenciosamente | Migration de backfill (Task 13) é idempotente — garante subconta mesmo em metas pré-existentes. |
| Conta de origem deletada após aporte | Já tratado por `nullOnDelete()` em `transfer_to_account_id` da migration `2026_05_15_000002`. A subconta virtual e a transferência ficam, mas a outra perna fica "órfã" — comportamento aceitável. |
