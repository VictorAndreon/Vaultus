# Plano C — Hardening Financeiro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endurecer a confiabilidade financeira do sistema em quatro frentes ortogonais: (1) precisão monetária via centavos como inteiros, (2) idempotência de escritas para evitar duplicação por clique-duplo, (3) audit log de toda mutation financeira para compliance, e (4) bloqueio backend de operações inválidas (ex: editar transferência via API direta).

**Architecture:** Centavos como inteiros são introduzidos via novo cast `MoneyCast` que substitui o `EncryptedCast` em colunas monetárias. Migration converte valores em texto criptografado de "12.34" para "1234". Idempotência é implementada por middleware `EnsureIdempotent` que consulta tabela `idempotency_keys` (chave única `user_id + endpoint + key`). Audit log usa Eloquent Observer (`FinanceAuditObserver`) que registra em tabela `audit_logs` toda escrita em Account/Transaction/FinancialGoal. Validações backend extras movem regras de "transferência não editável" do frontend para o controller.

**Tech Stack:** Laravel 11, Eloquent (Observers, Casts, Middleware), BCMath, PHPUnit

> **Dependência:** Este plano pode rodar em paralelo aos Planos A e B, mas o Checkpoint 1 (migração de centavos) impacta os outros — recomenda-se executá-lo **antes** ou em coordenação. Os demais Checkpoints (idempotência, audit, validações) são independentes.

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `app/Shared/Casts/MoneyCast.php` |
| Criar | `app/Shared/ValueObjects/Money.php` |
| Criar | `database/migrations/2026_05_18_000001_convert_money_columns_to_cents.php` |
| Modificar | `app/Domains/Finance/Models/Account.php` |
| Modificar | `app/Domains/Finance/Models/Transaction.php` |
| Modificar | `app/Domains/Finance/Models/FinancialGoal.php` |
| Modificar | `app/Domains/Finance/Models/BudgetCategory.php` |
| Modificar | `app/Domains/Finance/Models/UpcomingPayment.php` |
| Modificar | `app/Domains/Finance/Models/WishlistItem.php` |
| Criar | `database/migrations/2026_05_18_000010_create_idempotency_keys_table.php` |
| Criar | `app/Http/Middleware/EnsureIdempotent.php` |
| Modificar | `bootstrap/app.php` (registrar middleware) |
| Modificar | `routes/web.php` (aplicar middleware em finance writes) |
| Criar | `database/migrations/2026_05_18_000020_create_audit_logs_finance_table.php` (se não existir) |
| Criar | `app/Domains/Finance/Observers/FinanceAuditObserver.php` |
| Modificar | `app/Domains/Finance/Providers/FinanceServiceProvider.php` (ou `AppServiceProvider`) |
| Modificar | `app/Domains/Finance/Controllers/TransactionController.php` |
| Criar | `tests/Feature/Finance/MoneyPrecisionTest.php` |
| Criar | `tests/Feature/Finance/IdempotencyTest.php` |
| Criar | `tests/Feature/Finance/AuditLogTest.php` |
| Criar | `tests/Feature/Finance/TransferImmutabilityTest.php` |

---

## Checkpoint 1: Precisão Monetária (Centavos)

### Task 1: Escrever teste de precisão monetária

**Files:**
- Create: `tests/Feature/Finance/MoneyPrecisionTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Shared\ValueObjects\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MoneyPrecisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_money_value_object_stores_cents_as_integer()
    {
        $m = Money::fromReais('12.34');
        $this->assertSame(1234, $m->cents);
        $this->assertSame('12.34', $m->toReais());
    }

    public function test_money_handles_floating_point_pitfalls()
    {
        // 0.1 + 0.2 em float = 0.30000000000000004
        $a = Money::fromReais('0.1');
        $b = Money::fromReais('0.2');
        $sum = Money::fromCents($a->cents + $b->cents);
        $this->assertSame('0.30', $sum->toReais());
    }

    public function test_account_balance_uses_cents()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create([
            'user_id'           => $user->id,
            'type'              => 'checking',
            'balance_encrypted' => 1234, // centavos = R$12.34
        ]);

        $this->assertSame(1234, $account->balance_encrypted);
        $this->assertSame('12.34', Money::fromCents($account->balance_encrypted)->toReais());
    }

    public function test_repeated_additions_preserve_precision()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 0]);

        // 100 transações de R$ 0,01 cada
        for ($i = 0; $i < 100; $i++) {
            $account->transactions()->create([
                'type'             => 'income',
                'amount_encrypted' => 1, // 1 centavo
                'description'      => 'Centavo ' . $i,
                'occurred_at'      => '2026-05-01',
            ]);
        }

        // Soma exata: 100 × 1 = 100 centavos = R$ 1,00
        $balance = (int) $account->fresh()->current_balance;
        $this->assertSame(100, $balance, 'Cumulação de 100 centavos deve dar exatamente R$ 1,00');
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=MoneyPrecisionTest`
Expected: FAIL — classe `Money` não existe.

---

### Task 2: Criar Value Object `Money`

**Files:**
- Create: `app/Shared/ValueObjects/Money.php`

- [ ] **Step 1: Criar o VO**

```php
<?php

namespace App\Shared\ValueObjects;

final class Money
{
    public function __construct(public readonly int $cents)
    {
        if ($cents < PHP_INT_MIN || $cents > PHP_INT_MAX) {
            throw new \InvalidArgumentException('Money cents fora do range int.');
        }
    }

    public static function fromCents(int $cents): self
    {
        return new self($cents);
    }

    public static function fromReais(string|float|int $reais): self
    {
        if (is_int($reais))   return new self($reais * 100);
        if (is_float($reais)) $reais = number_format($reais, 2, '.', '');

        // Usar BCMath para evitar precisão flutuante
        $cents = bcmul((string) $reais, '100', 0);
        return new self((int) $cents);
    }

    public function toReais(): string
    {
        return bcdiv((string) $this->cents, '100', 2);
    }

    public function add(Money $other): self
    {
        return new self($this->cents + $other->cents);
    }

    public function subtract(Money $other): self
    {
        return new self($this->cents - $other->cents);
    }

    public function isZero(): bool
    {
        return $this->cents === 0;
    }

    public function isNegative(): bool
    {
        return $this->cents < 0;
    }

    public function __toString(): string
    {
        return $this->toReais();
    }
}
```

---

### Task 3: Criar `MoneyCast` que substitui `EncryptedCast` em colunas monetárias

**Files:**
- Create: `app/Shared/Casts/MoneyCast.php`

- [ ] **Step 1: Criar o cast**

```php
<?php

namespace App\Shared\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

/**
 * MoneyCast: armazena valor monetário como string criptografada de **centavos inteiros**.
 *
 * - Set: aceita int (centavos) ou string ("1234") e criptografa.
 * - Get: descriptografa e retorna **int** de centavos.
 *
 * Conversões para "reais" devem usar App\Shared\ValueObjects\Money.
 */
class MoneyCast implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes): ?int
    {
        if ($value === null) return null;

        try {
            $decrypted = Crypt::decryptString($value);
            return (int) $decrypted;
        } catch (DecryptException) {
            Log::critical('MoneyCast: falha ao descriptografar', [
                'key'   => $key,
                'model' => $model ? get_class($model) : null,
            ]);
            throw new \RuntimeException(sprintf(
                'Falha crítica ao ler campo monetário %s.%s. Não foi possível resolver o valor.',
                $model ? class_basename($model) : 'unknown',
                $key
            ));
        }
    }

    public function set($model, string $key, $value, array $attributes): ?string
    {
        if ($value === null) return null;

        $cents = is_int($value) ? $value : (int) $value;
        return Crypt::encryptString((string) $cents);
    }
}
```

> **Decisão arquitetural:** falha de descriptografia agora **lança exception** em vez de retornar `null` silenciosamente. Isso é uma melhoria de segurança — saldo zerado fantasma era pior que erro 500.

---

### Task 4: Criar migration que converte valores existentes de "reais" para centavos

**Files:**
- Create: `database/migrations/2026_05_18_000001_convert_money_columns_to_cents.php`

- [ ] **Step 1: Criar a migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Tabelas/colunas migradas:
     * - accounts.balance_encrypted
     * - accounts.credit_limit_encrypted
     * - transactions.amount_encrypted
     * - financial_goals.target_amount_encrypted
     * - financial_goals.current_amount_encrypted
     * - financial_goals.monthly_amount_encrypted
     * - transaction_goal.amount_encrypted
     * - budget_categories.budget_amount_encrypted
     * - upcoming_payments.amount_encrypted
     * - wishlist_items.price_encrypted (se existir)
     */
    public function up(): void
    {
        $targets = [
            ['accounts',          'balance_encrypted'],
            ['accounts',          'credit_limit_encrypted'],
            ['transactions',      'amount_encrypted'],
            ['financial_goals',   'target_amount_encrypted'],
            ['financial_goals',   'current_amount_encrypted'],
            ['financial_goals',   'monthly_amount_encrypted'],
            ['transaction_goal',  'amount_encrypted'],
            ['budget_categories', 'budget_amount_encrypted'],
            ['upcoming_payments', 'amount_encrypted'],
        ];

        // Wishlist é opcional — só migra se a coluna existir
        if (\Schema::hasColumn('wishlist_items', 'price_encrypted')) {
            $targets[] = ['wishlist_items', 'price_encrypted'];
        }

        foreach ($targets as [$table, $column]) {
            DB::table($table)->orderBy('id')->each(function ($row) use ($table, $column) {
                if ($row->$column === null) return;

                try {
                    $reais = decrypt($row->$column);
                } catch (\Throwable $e) {
                    // Já é centavo (re-run) ou corrupto: pular
                    return;
                }

                // Heurística: se o valor descriptografado contém ponto decimal, é "reais"; senão já é centavos
                if (str_contains((string) $reais, '.')) {
                    $cents = (int) bcmul((string) $reais, '100', 0);
                    DB::table($table)->where('id', $row->id)->update([
                        $column => encrypt((string) $cents),
                    ]);
                }
            });
        }
    }

    public function down(): void
    {
        // Conversão reversa: centavos → reais
        $targets = [
            ['accounts',          'balance_encrypted'],
            ['accounts',          'credit_limit_encrypted'],
            ['transactions',      'amount_encrypted'],
            ['financial_goals',   'target_amount_encrypted'],
            ['financial_goals',   'current_amount_encrypted'],
            ['financial_goals',   'monthly_amount_encrypted'],
            ['transaction_goal',  'amount_encrypted'],
            ['budget_categories', 'budget_amount_encrypted'],
            ['upcoming_payments', 'amount_encrypted'],
        ];

        if (\Schema::hasColumn('wishlist_items', 'price_encrypted')) {
            $targets[] = ['wishlist_items', 'price_encrypted'];
        }

        foreach ($targets as [$table, $column]) {
            DB::table($table)->orderBy('id')->each(function ($row) use ($table, $column) {
                if ($row->$column === null) return;
                try {
                    $value = decrypt($row->$column);
                    if (! str_contains((string) $value, '.')) {
                        $reais = bcdiv((string) $value, '100', 2);
                        DB::table($table)->where('id', $row->id)->update([
                            $column => encrypt((string) $reais),
                        ]);
                    }
                } catch (\Throwable $e) {
                    return;
                }
            });
        }
    }
};
```

- [ ] **Step 2: Rodar a migration**

Run: `docker compose exec app php artisan migrate`
Expected: `Migrated: 2026_05_18_000001_convert_money_columns_to_cents`

---

### Task 5: Trocar `EncryptedCast` por `MoneyCast` em todas as models financeiras

**Files:**
- Modify: `app/Domains/Finance/Models/Account.php`
- Modify: `app/Domains/Finance/Models/Transaction.php`
- Modify: `app/Domains/Finance/Models/FinancialGoal.php`
- Modify: `app/Domains/Finance/Models/BudgetCategory.php`
- Modify: `app/Domains/Finance/Models/UpcomingPayment.php`
- Modify: `app/Domains/Finance/Models/WishlistItem.php`
- Modify: `app/Domains/Finance/Models/TransactionGoal.php`

- [ ] **Step 1: Em cada model, atualizar o método `casts()`**

Trocar:
```php
'balance_encrypted'      => EncryptedCast::class,
'credit_limit_encrypted' => EncryptedCast::class,
```

Por:
```php
'balance_encrypted'      => \App\Shared\Casts\MoneyCast::class,
'credit_limit_encrypted' => \App\Shared\Casts\MoneyCast::class,
```

Repetir para `amount_encrypted`, `target_amount_encrypted`, `current_amount_encrypted`, `monthly_amount_encrypted`, `budget_amount_encrypted`, etc.

> **`interest_rate` continua como `float`** — é taxa, não valor monetário.

- [ ] **Step 2: Em `Account::getCurrentBalanceAttribute()`, atualizar para usar inteiros**

Substituir o método:

```php
public function getCurrentBalanceAttribute(): int
{
    $transactions = $this->relationLoaded('transactions')
        ? $this->transactions
        : $this->transactions()->get();

    $income  = $transactions->whereIn('type', ['income'])->sum(fn($t) => (int) $t->amount_encrypted);
    $expense = $transactions->whereIn('type', ['expense'])->sum(fn($t) => (int) $t->amount_encrypted);

    $transferOut = $transactions->where('type', 'transfer')
        ->filter(fn($t) => !is_null($t->transfer_to_account_id))
        ->sum(fn($t) => (int) $t->amount_encrypted);

    $transferIn = $transactions->where('type', 'transfer')
        ->filter(fn($t) => is_null($t->transfer_to_account_id))
        ->sum(fn($t) => (int) $t->amount_encrypted);

    $base = (int) ($this->balance_encrypted ?? 0);

    if ($this->is_liability) {
        return $base + $expense - $income - $transferIn + $transferOut;
    }

    return $base + $income - $expense + $transferIn - $transferOut;
}
```

---

### Task 6: Adaptar Controllers para receber centavos do frontend

**Files:**
- Modify: `app/Domains/Finance/Controllers/TransactionController.php` (e demais controllers de finance)

- [ ] **Step 1: No `store` de `TransactionController` (linha ~17), trocar validação**

Trocar:
```php
'amount_encrypted' => 'required|numeric|min:0.01',
```

Por:
```php
'amount_encrypted' => 'required|integer|min:1', // em centavos
```

- [ ] **Step 2: Repetir para `AccountController::store`, `GoalController::store/deposit`, `BudgetCategoryController::store/batch`, `UpcomingPaymentController::store`**

Em cada lugar onde o campo é monetário, validação vira `integer|min:N` (onde N é o mínimo em centavos).

- [ ] **Step 3: Adaptar resources (TransactionResource, AccountResource) para devolver centavos OU reais formatados**

Recomendação: devolver `amount_cents` e `amount_brl` (formatado) — frontend não precisa fazer cálculo.

Exemplo em `TransactionResource::toArray`:
```php
'amount_cents' => (int) $this->amount_encrypted,
'amount_brl'   => \App\Shared\ValueObjects\Money::fromCents((int) $this->amount_encrypted)->toReais(),
```

---

### Task 7: Adaptar Frontend para centavos

**Files:**
- Modify: `resources/js/Components/CurrencyInput.tsx`
- Modify: `resources/js/Pages/Finance/components/TransactionForm.tsx`
- Modify: `resources/js/Pages/Finance/components/GoalForm.tsx`
- Modify: `resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Atualizar `CurrencyInput` para emitir centavos**

Investigar arquivo atual e garantir que `onValueChange` retorna `number` em **centavos** (não reais). O ideal é o componente trabalhar internamente com centavos e mostrar a string formatada.

> Sem ver o conteúdo atual de `CurrencyInput.tsx`, a mudança específica não pode ser detalhada aqui. **Antes de executar este passo:** abrir o arquivo e adaptar conforme o padrão do componente. Tipicamente: trocar `valor / 100` por tratamento direto, ou manter o componente em reais e converter no submit.

- [ ] **Step 2: Em `TransactionForm.tsx:62`, garantir conversão**

```tsx
const data = {
    type,
    amount_encrypted: Math.round(amount * 100), // se CurrencyInput emite reais
    // ou
    amount_encrypted: amount, // se CurrencyInput já emite centavos
    description,
    occurred_at,
}
```

- [ ] **Step 3: Garantir `fmtBRL(amount)` recebe **centavos**

Atualizar a função:
```tsx
function fmtBRL(centsOrReais: number, opts?: { fromCents?: boolean }) {
  const reais = opts?.fromCents !== false ? centsOrReais / 100 : centsOrReais
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reais)
}
```

Ou (mais limpo): receber sempre centavos e dividir internamente.

---

### Task 8: Rodar suite completa e commitar Checkpoint 1

- [ ] **Step 1: Rodar**

Run: `docker compose exec app php artisan test`
Expected: All PASS. Pode haver testes existentes que precisam ajuste para centavos.

- [ ] **Step 2: Commitar**

```bash
git add app/Shared/ValueObjects/Money.php \
        app/Shared/Casts/MoneyCast.php \
        database/migrations/2026_05_18_000001_convert_money_columns_to_cents.php \
        app/Domains/Finance/Models/*.php \
        app/Domains/Finance/Controllers/*.php \
        app/Http/Resources/*.php \
        resources/js/Components/CurrencyInput.tsx \
        resources/js/Pages/Finance/ \
        tests/Feature/Finance/MoneyPrecisionTest.php
git commit -m "feat(finance): valores monetários em centavos (precisão exata)"
```

---

## Checkpoint 2: Idempotência

### Task 9: Escrever teste de idempotência

**Files:**
- Create: `tests/Feature/Finance/IdempotencyTest.php`

- [ ] **Step 1: Criar o teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_idempotency_key_does_not_create_duplicate_transaction()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 100000]);

        $headers = ['Idempotency-Key' => 'tx-abc-123'];
        $body = [
            'type'             => 'expense',
            'amount_encrypted' => 1000,
            'description'      => 'Mercado',
            'occurred_at'      => '2026-05-15',
        ];

        $r1 = $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, $headers);
        $r2 = $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, $headers);

        $r1->assertSuccessful();
        $r2->assertSuccessful();

        // Apenas UMA transação foi criada
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_different_keys_create_separate_transactions()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 100000]);

        $body = ['type' => 'expense', 'amount_encrypted' => 500, 'description' => 'Mercado', 'occurred_at' => '2026-05-15'];

        $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, ['Idempotency-Key' => 'key-1']);
        $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body, ['Idempotency-Key' => 'key-2']);

        $this->assertDatabaseCount('transactions', 2);
    }

    public function test_request_without_idempotency_key_still_works()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 100000]);

        $body = ['type' => 'expense', 'amount_encrypted' => 100, 'description' => 'Sem chave', 'occurred_at' => '2026-05-15'];

        $response = $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", $body);
        $response->assertSuccessful();
        $this->assertDatabaseCount('transactions', 1);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=IdempotencyTest`
Expected: FAIL — duplicado.

---

### Task 10: Criar migration para `idempotency_keys`

**Files:**
- Create: `database/migrations/2026_05_18_000010_create_idempotency_keys_table.php`

- [ ] **Step 1: Criar migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('key', 100);
            $table->string('endpoint', 200);
            $table->unsignedSmallInteger('response_status');
            $table->text('response_body');
            $table->timestamps();

            $table->unique(['user_id', 'endpoint', 'key']);
            $table->index('created_at'); // para limpeza periódica
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
```

- [ ] **Step 2: Rodar**

Run: `docker compose exec app php artisan migrate`

---

### Task 11: Criar middleware `EnsureIdempotent`

**Files:**
- Create: `app/Http/Middleware/EnsureIdempotent.php`

- [ ] **Step 1: Criar o middleware**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotent
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key || ! $request->user()) {
            return $next($request);
        }

        $endpoint = $request->method() . ' ' . $request->path();
        $userId   = $request->user()->id;

        $cached = DB::table('idempotency_keys')
            ->where(['user_id' => $userId, 'endpoint' => $endpoint, 'key' => $key])
            ->first();

        if ($cached) {
            return response($cached->response_body, $cached->response_status)
                ->header('Content-Type', 'application/json')
                ->header('X-Idempotent-Replay', 'true');
        }

        $response = $next($request);

        // Só persistir respostas bem-sucedidas (2xx) para evitar cache de erros transitórios
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            try {
                DB::table('idempotency_keys')->insert([
                    'user_id'         => $userId,
                    'key'             => $key,
                    'endpoint'        => $endpoint,
                    'response_status' => $response->getStatusCode(),
                    'response_body'   => $response->getContent(),
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException) {
                // Race: outra requisição já gravou. Buscar e devolver a versão persistida.
                $cached = DB::table('idempotency_keys')
                    ->where(['user_id' => $userId, 'endpoint' => $endpoint, 'key' => $key])
                    ->first();
                if ($cached) {
                    return response($cached->response_body, $cached->response_status)
                        ->header('Content-Type', 'application/json')
                        ->header('X-Idempotent-Replay', 'true');
                }
            }
        }

        return $response;
    }
}
```

---

### Task 12: Registrar middleware e aplicar em rotas de escrita financeira

**Files:**
- Modify: `bootstrap/app.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Registrar alias do middleware em `bootstrap/app.php`**

Em `withMiddleware(function (Middleware $middleware) { ... })`:

```php
$middleware->alias([
    'idempotent' => \App\Http\Middleware\EnsureIdempotent::class,
]);
```

- [ ] **Step 2: Em `routes/web.php`, agrupar rotas de escrita finance**

Trocar:
```php
Route::post('/finance/accounts', [AccountController::class, 'store']);
Route::post('/finance/accounts/{account}/transactions', [TransactionController::class, 'store']);
Route::post('/finance/goals/{goal}/deposit', [GoalController::class, 'deposit']);
// ... outras POSTs
```

Por:
```php
Route::middleware('idempotent')->group(function () {
    Route::post('/finance/accounts', [AccountController::class, 'store']);
    Route::post('/finance/accounts/{account}/transactions', [TransactionController::class, 'store']);
    Route::post('/finance/goals/{goal}/deposit', [GoalController::class, 'deposit']);
    Route::post('/finance/goals', [GoalController::class, 'store']);
    Route::post('/finance/budget-categories', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'store']);
    Route::post('/finance/upcoming-payments', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'store']);
});
```

- [ ] **Step 3: Frontend — enviar Idempotency-Key em escritas**

Em `resources/js/Pages/Finance/Index.tsx` (e demais que usam `router.post`), envolver POSTs em wrapper:

```ts
function idempotentPost(url: string, data: any, options: any = {}) {
  const key = crypto.randomUUID()
  return router.post(url, data, {
    ...options,
    headers: { ...(options.headers || {}), 'Idempotency-Key': key },
  })
}
```

E substituir os `router.post('/finance/...')` por `idempotentPost('/finance/...')`.

- [ ] **Step 4: Rodar testes**

Run: `docker compose exec app php artisan test --filter=IdempotencyTest`
Expected: All PASS.

---

### Task 13: Criar comando de limpeza periódica

**Files:**
- Create: `app/Console/Commands/PruneIdempotencyKeys.php`

- [ ] **Step 1: Criar o comando**

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PruneIdempotencyKeys extends Command
{
    protected $signature = 'idempotency:prune {--days=7}';
    protected $description = 'Remove idempotency keys mais antigas que N dias';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $deleted = DB::table('idempotency_keys')->where('created_at', '<', $cutoff)->delete();

        $this->info(sprintf('Removidas %d chaves de idempotência anteriores a %s', $deleted, $cutoff->toDateString()));
        return self::SUCCESS;
    }
}
```

- [ ] **Step 2: Agendar em `app/Console/Kernel.php` ou `bootstrap/app.php`**

```php
->withSchedule(function (Schedule $schedule) {
    $schedule->command('idempotency:prune --days=7')->daily();
})
```

---

### Task 14: Commitar Checkpoint 2

- [ ] **Step 1: Commitar**

```bash
git add database/migrations/2026_05_18_000010_create_idempotency_keys_table.php \
        app/Http/Middleware/EnsureIdempotent.php \
        app/Console/Commands/PruneIdempotencyKeys.php \
        bootstrap/app.php \
        routes/web.php \
        resources/js/Pages/Finance/Index.tsx \
        tests/Feature/Finance/IdempotencyTest.php
git commit -m "feat(finance): idempotência em escritas financeiras via Idempotency-Key"
```

---

## Checkpoint 3: Audit Log

### Task 15: Escrever teste de audit log

**Files:**
- Create: `tests/Feature/Finance/AuditLogTest.php`

- [ ] **Step 1: Criar o teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_account_writes_audit_entry()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/finance/accounts', [
            'name'              => 'Nova conta',
            'type'              => 'checking',
            'balance_encrypted' => 100000,
            'currency'          => 'BRL',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event'   => 'finance.account.created',
        ]);
    }

    public function test_creating_transaction_writes_audit_entry()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson("/finance/accounts/{$account->id}/transactions", [
            'type'             => 'expense',
            'amount_encrypted' => 5000,
            'description'      => 'Padaria',
            'occurred_at'      => '2026-05-15',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event'   => 'finance.transaction.created',
        ]);
    }

    public function test_deleting_transaction_writes_audit_entry()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);
        $tx      = $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1000, 'description' => 'X', 'occurred_at' => '2026-05-01']);

        $this->actingAs($user)->deleteJson("/finance/transactions/{$tx->id}");

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event'   => 'finance.transaction.deleted',
        ]);
    }
}
```

- [ ] **Step 2: Verificar se tabela `audit_logs` existe**

Run: `docker compose exec app php artisan tinker --execute='echo Schema::hasTable("audit_logs") ? "exists" : "missing";'`

Se NÃO existir, criar migration na próxima task. Se existir, pular para Task 17.

---

### Task 16: Criar migration `audit_logs` se necessário

**Files:**
- Create: `database/migrations/2026_05_18_000020_create_audit_logs_table.php`

> Pular se já existe (verificar referência em `DashboardAggregator.php:257` — `$user->auditLogs()` — para confirmar se a tabela já tem migration).

- [ ] **Step 1: Criar migration (apenas se não existir)**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('audit_logs')) return;

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('event', 100);
            $table->string('subject_type', 100)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('payload')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['event', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
```

- [ ] **Step 2: Rodar migration**

Run: `docker compose exec app php artisan migrate`

---

### Task 17: Criar Observer `FinanceAuditObserver`

**Files:**
- Create: `app/Domains/Finance/Observers/FinanceAuditObserver.php`

- [ ] **Step 1: Criar o Observer**

```php
<?php

namespace App\Domains\Finance\Observers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FinanceAuditObserver
{
    private function log(Model $model, string $action): void
    {
        $user = Auth::user();
        if (! $user) return; // Operações sem usuário (CLI, jobs) não auditam.

        $request = request();

        DB::table('audit_logs')->insert([
            'user_id'      => $user->id,
            'event'        => sprintf('finance.%s.%s', $this->subjectKey($model), $action),
            'subject_type' => get_class($model),
            'subject_id'   => $model->getKey(),
            'payload'      => json_encode([
                'attributes' => $model->getAttributes(),
                'original'   => $action === 'updated' ? $model->getOriginal() : null,
                'changes'    => $action === 'updated' ? $model->getChanges() : null,
            ]),
            'ip'           => $request?->ip(),
            'user_agent'   => substr((string) $request?->userAgent(), 0, 255),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    private function subjectKey(Model $model): string
    {
        return match (get_class($model)) {
            \App\Domains\Finance\Models\Account::class        => 'account',
            \App\Domains\Finance\Models\Transaction::class    => 'transaction',
            \App\Domains\Finance\Models\FinancialGoal::class  => 'goal',
            \App\Domains\Finance\Models\TransactionGoal::class=> 'goal_allocation',
            \App\Domains\Finance\Models\BudgetCategory::class => 'budget_category',
            \App\Domains\Finance\Models\UpcomingPayment::class=> 'upcoming_payment',
            default                                           => strtolower(class_basename($model)),
        };
    }

    public function created(Model $model): void  { $this->log($model, 'created'); }
    public function updated(Model $model): void  { $this->log($model, 'updated'); }
    public function deleted(Model $model): void  { $this->log($model, 'deleted'); }
    public function restored(Model $model): void { $this->log($model, 'restored'); }
}
```

---

### Task 18: Registrar Observer em `AppServiceProvider`

**Files:**
- Modify: `app/Providers/AppServiceProvider.php`

- [ ] **Step 1: No método `boot()`, registrar o Observer para todas as models financeiras**

```php
public function boot(): void
{
    $observer = \App\Domains\Finance\Observers\FinanceAuditObserver::class;
    \App\Domains\Finance\Models\Account::observe($observer);
    \App\Domains\Finance\Models\Transaction::observe($observer);
    \App\Domains\Finance\Models\FinancialGoal::observe($observer);
    \App\Domains\Finance\Models\TransactionGoal::observe($observer);
    \App\Domains\Finance\Models\BudgetCategory::observe($observer);
    \App\Domains\Finance\Models\UpcomingPayment::observe($observer);
}
```

- [ ] **Step 2: Rodar testes**

Run: `docker compose exec app php artisan test --filter=AuditLogTest`
Expected: All PASS.

---

### Task 19: Commitar Checkpoint 3

- [ ] **Step 1: Commitar**

```bash
git add database/migrations/2026_05_18_000020_create_audit_logs_table.php \
        app/Domains/Finance/Observers/FinanceAuditObserver.php \
        app/Providers/AppServiceProvider.php \
        tests/Feature/Finance/AuditLogTest.php
git commit -m "feat(finance): audit log de toda mutation financeira via Observer"
```

---

## Checkpoint 4: Bloqueios Backend de Operações Inválidas

### Task 20: Escrever teste de imutabilidade de transferência

**Files:**
- Create: `tests/Feature/Finance/TransferImmutabilityTest.php`

- [ ] **Step 1: Criar o teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_cannot_be_edited_via_api()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 500000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->postJson("/finance/accounts/{$source->id}/transactions", [
            'type'                   => 'transfer',
            'amount_encrypted'       => 100000,
            'description'            => 'Original',
            'occurred_at'            => '2026-05-15',
            'transfer_to_account_id' => $dest->id,
        ]);

        $transfer = $source->transactions()->where('type', 'transfer')->first();

        $response = $this->actingAs($user)->patchJson("/finance/transactions/{$transfer->id}", [
            'amount_encrypted' => 999999,
            'description'      => 'Hack',
        ]);

        $response->assertStatus(422);
        $this->assertSame(100000, (int) $transfer->fresh()->amount_encrypted);
        $this->assertSame('Original', $transfer->fresh()->description);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=TransferImmutabilityTest`
Expected: FAIL — `update` aceita a edição.

---

### Task 21: Adicionar guarda no `TransactionController::update`

**Files:**
- Modify: `app/Domains/Finance/Controllers/TransactionController.php`

- [ ] **Step 1: Adicionar `abort_if` no topo do método `update` (linha ~64)**

Trocar:
```php
public function update(Request $request, Transaction $transaction)
{
    abort_if($transaction->account->user_id !== $request->user()->id, 403);

    $validated = $request->validate([
        'type'             => 'sometimes|in:income,expense',
        ...
```

Por:
```php
public function update(Request $request, Transaction $transaction)
{
    abort_if($transaction->account->user_id !== $request->user()->id, 403);
    abort_if($transaction->type === 'transfer', 422, 'Transferências não podem ser editadas. Exclua e recrie.');

    $validated = $request->validate([
        'type'             => 'sometimes|in:income,expense',
        ...
```

- [ ] **Step 2: Garantir atomicidade de `destroy` (linhas 80-94)**

Substituir o método completo por:

```php
public function destroy(Request $request, Transaction $transaction)
{
    abort_if($transaction->account->user_id !== $request->user()->id, 403);

    \DB::transaction(function () use ($request, $transaction) {
        if ($transaction->transfer_pair_id) {
            $pair = Transaction::find($transaction->transfer_pair_id);
            if ($pair && $pair->account->user_id === $request->user()->id) {
                $pair->delete();
            }
        }
        $transaction->delete();
    });

    return back();
}
```

- [ ] **Step 3: Rodar testes**

Run: `docker compose exec app php artisan test --filter='TransferImmutabilityTest|TransferTransactionTest'`
Expected: All PASS.

---

### Task 22: Validação cruzada de `interest_rate`/`credit_limit` por tipo de conta

**Files:**
- Modify: `app/Domains/Finance/Controllers/AccountController.php`

- [ ] **Step 1: Adicionar validação extra em `store` (após `validate`)**

```php
public function store(Request $request)
{
    $validated = $request->validate([
        'name'                   => 'required|string|max:255',
        'type'                   => 'required|in:checking,savings,investment,cash,credit,loan',
        'balance_encrypted'      => 'required|integer',
        'currency'               => 'required|string|size:3',
        'credit_limit_encrypted' => 'nullable|integer|min:0',
        'interest_rate'          => 'nullable|numeric|min:0|max:999',
    ]);

    // Validação cruzada
    if (! in_array($validated['type'], ['credit', 'loan'])) {
        if (! empty($validated['credit_limit_encrypted'])) {
            abort(422, 'credit_limit só é aplicável a contas do tipo credit/loan.');
        }
        if (! empty($validated['interest_rate'])) {
            abort(422, 'interest_rate só é aplicável a contas do tipo credit/loan.');
        }
    }

    $request->user()->accounts()->create($validated);

    return back();
}
```

---

### Task 23: Commitar Checkpoint 4

- [ ] **Step 1: Rodar tudo**

Run: `docker compose exec app php artisan test`
Expected: All PASS.

- [ ] **Step 2: Commitar**

```bash
git add app/Domains/Finance/Controllers/TransactionController.php \
        app/Domains/Finance/Controllers/AccountController.php \
        tests/Feature/Finance/TransferImmutabilityTest.php
git commit -m "feat(finance): bloqueios backend (transferência imutável + validação cruzada de conta)"
```

---

## Critérios de Conclusão

- [ ] `php artisan test` passa sem regressões.
- [ ] `MoneyPrecisionTest`, `IdempotencyTest`, `AuditLogTest`, `TransferImmutabilityTest` todos verdes.
- [ ] `audit_logs` populando corretamente (verificar via tinker ou SQL).
- [ ] Clique duplo no botão "Confirmar aporte" cria apenas 1 transação (smoke test manual).
- [ ] Tentativa de PATCH em transferência via curl direto retorna 422.

## Riscos & Mitigações

| Risco | Mitigação |
|-------|-----------|
| Migração de centavos quebra dados em produção | Migration é idempotente (heurística `str_contains('.')` detecta se já foi convertido). Backup antes via `mysqldump` é boa prática — ver `backups/`. |
| Idempotency-Key colidindo entre usuários | A unique constraint inclui `user_id`, então usuários diferentes podem usar a mesma chave sem conflito. |
| `audit_logs` crescendo indefinidamente | Adicionar comando `audit:prune --days=365` similar ao `idempotency:prune`. Fica como follow-up. |
| Observer impactando performance de bulk inserts | Eloquent Observers só disparam em saves individuais. `DB::table()->insert([...])` não dispara — útil para seeders/migrations. Confirmar que escritas normais via Model `create()` são auditadas. |
| Money em centavos não cabe em int 32-bit | PHP `int` é 64-bit em sistemas modernos. R$ 92 quatrilhões cabem sem overflow. Sem risco prático. |
