# Finance P0 — Foundation Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as 3 distorções que fazem o dashboard financeiro mentir: net_worth sem passivos, transferências inflando income/expense, e categorias de orçamento desconectadas das transações.

**Architecture:** (1) Expandir tipos de conta para incluir `credit` e `loan` como passivos, invertendo o sinal no cálculo de patrimônio. (2) Introduzir o tipo `transfer` na transação com vínculo entre contas, excluindo-o das somas de income/expense. (3) Passar `budget_categories` do usuário ao frontend para que o formulário de transação use essas categorias como opções.

**Tech Stack:** Laravel 11, Eloquent, Inertia.js, React 18, TypeScript

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `database/migrations/2026_05_15_000001_add_credit_loan_fields_to_accounts.php` |
| Criar | `database/migrations/2026_05_15_000002_add_transfer_to_transactions.php` |
| Modificar | `app/Domains/Finance/Models/Account.php` |
| Modificar | `app/Domains/Finance/Models/Transaction.php` |
| Modificar | `app/Domains/Finance/Controllers/AccountController.php` |
| Modificar | `app/Domains/Finance/Controllers/TransactionController.php` |
| Modificar | `app/Domains/Finance/Controllers/FinanceController.php` |
| Modificar | `resources/js/Pages/Finance/components/AccountForm.tsx` |
| Modificar | `resources/js/Pages/Finance/components/TransactionForm.tsx` |
| Criar | `tests/Feature/Finance/AccountTypeTest.php` |
| Criar | `tests/Feature/Finance/TransferTransactionTest.php` |
| Criar | `tests/Feature/Finance/BudgetCategoryLinkageTest.php` |

---

## Checkpoint 1: Contas de Crédito e Dívida com Patrimônio Real

### Task 1: Escrever o teste de criação de conta de crédito

**Files:**
- Create: `tests/Feature/Finance/AccountTypeTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_credit_account_is_accepted()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/finance/accounts', [
            'name'              => 'Cartão Nubank',
            'type'              => 'credit',
            'balance_encrypted' => 0,
            'currency'          => 'BRL',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('accounts', ['name' => 'Cartão Nubank', 'type' => 'credit']);
    }

    public function test_loan_account_is_accepted()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/finance/accounts', [
            'name'              => 'Financiamento Carro',
            'type'              => 'loan',
            'balance_encrypted' => 30000,
            'currency'          => 'BRL',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('accounts', ['name' => 'Financiamento Carro', 'type' => 'loan']);
    }

    public function test_net_worth_subtracts_liabilities()
    {
        $user = User::factory()->create();
        $asset   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 50000]);
        $liability = Account::factory()->create(['user_id' => $user->id, 'type' => 'credit',  'balance_encrypted' => 8000]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('net_worth', 42000.0)
        );
    }

    public function test_credit_account_is_liability()
    {
        $account = new Account(['type' => 'credit']);
        $this->assertTrue($account->is_liability);
    }

    public function test_loan_account_is_liability()
    {
        $account = new Account(['type' => 'loan']);
        $this->assertTrue($account->is_liability);
    }

    public function test_checking_account_is_not_liability()
    {
        $account = new Account(['type' => 'checking']);
        $this->assertFalse($account->is_liability);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd /home/andreon/Documentos/Vaultus/src && docker compose exec app php artisan test tests/Feature/Finance/AccountTypeTest.php
```

Esperado: FAIL — tipo `credit` rejeitado, `is_liability` não existe, `net_worth` incorreto.

---

### Task 2: Criar migration para campos de crédito/dívida

**Files:**
- Create: `database/migrations/2026_05_15_000001_add_credit_loan_fields_to_accounts.php`

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
            // Limite de crédito (somente para tipo 'credit')
            $table->text('credit_limit_encrypted')->nullable()->after('balance_encrypted');
            // Taxa de juros anual % (somente para tipos 'credit' e 'loan')
            $table->decimal('interest_rate', 5, 2)->nullable()->after('credit_limit_encrypted');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['credit_limit_encrypted', 'interest_rate']);
        });
    }
};
```

- [ ] **Step 2: Rodar a migration**

```bash
docker compose exec app php artisan migrate
```

Esperado: `Migrating: 2026_05_15_000001_add_credit_loan_fields_to_accounts` → done.

---

### Task 3: Atualizar o model Account

**Files:**
- Modify: `app/Domains/Finance/Models/Account.php`

- [ ] **Step 1: Atualizar o model completo**

```php
<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'type', 'balance_encrypted', 'currency',
        'credit_limit_encrypted', 'interest_rate',
    ];

    // Tipos que representam passivos financeiros
    public const LIABILITY_TYPES = ['credit', 'loan'];

    protected function casts(): array
    {
        return [
            'balance_encrypted'       => EncryptedCast::class,
            'credit_limit_encrypted'  => EncryptedCast::class,
            'interest_rate'           => 'float',
        ];
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

        $income  = $transactions->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
        $expense = $transactions->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);

        return (float) ($this->balance_encrypted ?? 0) + $income - $expense;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
```

---

### Task 4: Atualizar AccountController — aceitar credit e loan

**Files:**
- Modify: `app/Domains/Finance/Controllers/AccountController.php`

- [ ] **Step 1: Alterar a validação do tipo na linha 51**

Localizar:
```php
'type' => 'required|in:checking,savings,investment,cash',
```

Substituir por:
```php
'type' => 'required|in:checking,savings,investment,cash,credit,loan',
```

E adicionar os novos campos opcionais logo abaixo:
```php
'credit_limit_encrypted' => 'nullable|numeric|min:0',
'interest_rate'          => 'nullable|numeric|min:0|max:999',
```

O método `store` completo deve ficar:
```php
public function store(Request $request)
{
    $validated = $request->validate([
        'name'                   => 'required|string|max:255',
        'type'                   => 'required|in:checking,savings,investment,cash,credit,loan',
        'balance_encrypted'      => 'required|numeric',
        'currency'               => 'required|string|size:3',
        'credit_limit_encrypted' => 'nullable|numeric|min:0',
        'interest_rate'          => 'nullable|numeric|min:0|max:999',
    ]);

    $request->user()->accounts()->create($validated);

    return back();
}
```

---

### Task 5: Corrigir net_worth no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Alterar o cálculo de netWorth na linha 20**

Localizar:
```php
$netWorth = (float) $accounts->sum(fn($a) => $a->current_balance);
```

Substituir por:
```php
$netWorth = (float) $accounts->sum(function ($a) {
    $balance = (float) $a->current_balance;
    return $a->is_liability ? -$balance : $balance;
});
```

- [ ] **Step 2: Adicionar `is_liability` ao donut**

O donut atual divide por `$netWorth` e pode ter valores negativos. Ajustar a lógica do donut para usar o total de ativos (não net_worth) como denominador:

Localizar:
```php
$donut = $netWorth > 0 ? array_values(array_map(fn($g) => [
    'label'  => $g['label'], 'color' => $g['color'],
    'amount' => round($g['amount'], 2),
    'pct'    => (int) round($g['amount'] / $netWorth * 100),
], $donutGroups)) : [];
```

Substituir por:
```php
$totalAssets = (float) $accounts->filter(fn($a) => !$a->is_liability)->sum('current_balance');
$donut = array_values(array_filter(array_map(fn($g) => [
    'label'  => $g['label'],
    'color'  => $g['color'],
    'amount' => round(abs($g['amount']), 2),
    'pct'    => $totalAssets > 0 ? (int) round(abs($g['amount']) / $totalAssets * 100) : 0,
    'is_liability' => $g['is_liability'] ?? false,
], $donutGroups), fn($g) => $g['amount'] != 0));
```

Também atualizar o loop de `$donutGroups` para armazenar `is_liability`:
```php
foreach ($accounts as $account) {
    $type  = $account->type ?? 'checking';
    $meta  = $typeMap[$type] ?? ['label' => ucfirst($type), 'color' => 'var(--text-4)'];
    $label = $meta['label'];
    $donutGroups[$label]['label']       = $label;
    $donutGroups[$label]['color']       = $meta['color'];
    $donutGroups[$label]['is_liability'] = $account->is_liability;
    $donutGroups[$label]['amount']      = ($donutGroups[$label]['amount'] ?? 0) + (float) $account->current_balance;
}
```

E adicionar `credit` e `loan` ao `$typeMap`:
```php
$typeMap = [
    'checking'   => ['label' => 'Conta corrente', 'color' => 'var(--text-4)'],
    'savings'    => ['label' => 'Poupança',       'color' => 'var(--sky)'],
    'investment' => ['label' => 'Investimentos',  'color' => 'var(--green)'],
    'credit'     => ['label' => 'Crédito',        'color' => 'var(--rose)'],
    'loan'       => ['label' => 'Financiamento',  'color' => 'var(--amber)'],
    'cash'       => ['label' => 'Dinheiro',       'color' => 'var(--yellow)'],
];
```

---

### Task 6: Atualizar AccountForm.tsx — tipos credit/loan

**Files:**
- Modify: `resources/js/Pages/Finance/components/AccountForm.tsx`

- [ ] **Step 1: Substituir o conteúdo completo do arquivo**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import CurrencyInput from '@/Components/CurrencyInput'
import { Account } from '@/types'

const LIABILITY_TYPES = ['credit', 'loan'] as const

interface Props {
    account: Account | null
    onClose: () => void
}

export default function AccountForm({ account, onClose }: Props) {
    const [name, setName] = useState(account?.name ?? '')
    const [type, setType] = useState(account?.type ?? 'checking')
    const [balance, setBalance] = useState<number>(0)
    const [currency, setCurrency] = useState(account?.currency ?? 'BRL')
    const [creditLimit, setCreditLimit] = useState<number>(0)
    const [interestRate, setInterestRate] = useState<number | ''>('')

    const isLiability = LIABILITY_TYPES.includes(type as any)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (account) {
            router.patch('/finance/accounts/' + account.id, { name, currency }, { preserveScroll: true })
        } else {
            router.post('/finance/accounts', {
                name,
                type,
                balance_encrypted: balance,
                currency,
                ...(type === 'credit' && { credit_limit_encrypted: creditLimit }),
                ...(isLiability && interestRate !== '' && { interest_rate: interestRate }),
            }, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 28, width: '100%', maxWidth: 480, zIndex: 50 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                    {account ? 'Editar conta' : 'Nova conta'}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" />
                    </div>

                    {!account && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
                            <select value={type} onChange={e => setType(e.target.value)} className="input">
                                <optgroup label="Ativos">
                                    <option value="checking">Conta corrente</option>
                                    <option value="savings">Poupança</option>
                                    <option value="investment">Investimento</option>
                                    <option value="cash">Dinheiro</option>
                                </optgroup>
                                <optgroup label="Passivos (dívidas)">
                                    <option value="credit">Cartão de crédito</option>
                                    <option value="loan">Financiamento / empréstimo</option>
                                </optgroup>
                            </select>
                            {isLiability && (
                                <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 4 }}>
                                    Este tipo é um passivo — será subtraído do seu patrimônio líquido.
                                </p>
                            )}
                        </div>
                    )}

                    {!account && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>
                                {isLiability ? 'Dívida atual (saldo devedor)' : 'Saldo inicial'}
                            </label>
                            <CurrencyInput className="input" value={balance} onValueChange={setBalance} />
                        </div>
                    )}

                    {!account && type === 'credit' && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Limite do cartão</label>
                            <CurrencyInput className="input" value={creditLimit} onValueChange={setCreditLimit} />
                        </div>
                    )}

                    {!account && isLiability && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Taxa de juros anual (%) — opcional</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="999"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input"
                                placeholder="Ex: 12.5"
                            />
                        </div>
                    )}

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Moeda</label>
                        <input
                            type="text"
                            value={currency}
                            onChange={e => setCurrency(e.target.value.toUpperCase())}
                            maxLength={3}
                            className="input"
                        />
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

### Task 7: Rodar testes e commitar Checkpoint 1

- [ ] **Step 1: Rodar os testes de tipo de conta**

```bash
docker compose exec app php artisan test tests/Feature/Finance/AccountTypeTest.php
```

Esperado: todos os 6 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  database/migrations/2026_05_15_000001_add_credit_loan_fields_to_accounts.php \
  app/Domains/Finance/Models/Account.php \
  app/Domains/Finance/Controllers/AccountController.php \
  app/Domains/Finance/Controllers/FinanceController.php \
  resources/js/Pages/Finance/components/AccountForm.tsx \
  tests/Feature/Finance/AccountTypeTest.php

git commit -m "feat: contas de crédito/dívida como passivos no patrimônio líquido"
```

---

## Checkpoint 2: Transferências Entre Contas

### Task 8: Escrever o teste de transferência

**Files:**
- Create: `tests/Feature/Finance/TransferTransactionTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferTransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_creates_two_linked_transactions()
    {
        $user    = User::factory()->create();
        $source  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest    = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                    => 'transfer',
            'amount_encrypted'        => 1000,
            'description'             => 'Reserva mensal',
            'occurred_at'             => '2026-05-15',
            'transfer_to_account_id'  => $dest->id,
        ]);

        // Deve criar dois registros vinculados
        $this->assertDatabaseHas('transactions', [
            'account_id' => $source->id,
            'type'       => 'transfer',
        ]);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $dest->id,
            'type'       => 'transfer',
        ]);
    }

    public function test_transfer_does_not_inflate_month_income_or_expense()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $this->actingAs($user)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                   => 'transfer',
            'amount_encrypted'       => 1000,
            'description'            => 'Transferência',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('month_income', 0.0)
                 ->where('month_expense', 0.0)
        );
    }

    public function test_transfer_preserves_total_balance()
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 2000]);

        $this->actingAs($user)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                   => 'transfer',
            'amount_encrypted'       => 1000,
            'description'            => 'Reserva',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        // Net worth permanece 7000 (5000 + 2000)
        $response->assertInertia(fn ($page) =>
            $page->where('net_worth', 7000.0)
        );
    }

    public function test_transfer_to_another_users_account_is_forbidden()
    {
        $user1  = User::factory()->create();
        $user2  = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user1->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $dest   = Account::factory()->create(['user_id' => $user2->id, 'type' => 'savings',  'balance_encrypted' => 0]);

        $response = $this->actingAs($user1)->post('/finance/accounts/' . $source->id . '/transactions', [
            'type'                   => 'transfer',
            'amount_encrypted'       => 500,
            'description'            => 'Hack',
            'occurred_at'            => now()->format('Y-m-d'),
            'transfer_to_account_id' => $dest->id,
        ]);

        $response->assertStatus(422);
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/TransferTransactionTest.php
```

Esperado: FAIL — tipo `transfer` rejeitado, `transfer_to_account_id` não existe.

---

### Task 9: Criar migration para transferência

**Files:**
- Create: `database/migrations/2026_05_15_000002_add_transfer_to_transactions.php`

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
            // Vínculo entre as duas metades de uma transferência
            $table->foreignId('transfer_to_account_id')
                ->nullable()
                ->after('occurred_at')
                ->constrained('accounts')
                ->nullOnDelete();

            // ID do par espelho (o registro na conta destino)
            $table->foreignId('transfer_pair_id')
                ->nullable()
                ->after('transfer_to_account_id')
                ->constrained('transactions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transfer_to_account_id');
            $table->dropConstrainedForeignId('transfer_pair_id');
        });
    }
};
```

- [ ] **Step 2: Rodar a migration**

```bash
docker compose exec app php artisan migrate
```

---

### Task 10: Atualizar Transaction model

**Files:**
- Modify: `app/Domains/Finance/Models/Transaction.php`

- [ ] **Step 1: Substituir o conteúdo completo**

```php
<?php

namespace App\Domains\Finance\Models;

use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'account_id', 'type', 'amount_encrypted', 'description',
        'category', 'occurred_at', 'transfer_to_account_id', 'transfer_pair_id',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
            'occurred_at'      => 'date',
        ];
    }

    public function getIsTransferAttribute(): bool
    {
        return $this->type === 'transfer';
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function transferDestination()
    {
        return $this->belongsTo(Account::class, 'transfer_to_account_id');
    }

    public function transferPair()
    {
        return $this->belongsTo(Transaction::class, 'transfer_pair_id');
    }

    public function transactionGoals()
    {
        return $this->hasMany(TransactionGoal::class);
    }
}
```

---

### Task 11: Atualizar TransactionController — criar pares de transferência

**Files:**
- Modify: `app/Domains/Finance/Controllers/TransactionController.php`

- [ ] **Step 1: Substituir o conteúdo completo**

```php
<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TransactionController extends Controller
{
    public function store(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'type'                   => 'required|in:income,expense,transfer',
            'amount_encrypted'       => 'required|numeric|min:0.01',
            'description'            => 'required|string|max:255',
            'category'               => 'nullable|string|max:100',
            'occurred_at'            => 'required|date_format:Y-m-d',
            'transfer_to_account_id' => 'required_if:type,transfer|nullable|exists:accounts,id',
        ]);

        if ($validated['type'] === 'transfer') {
            $this->createTransferPair($request->user(), $account, $validated);
        } else {
            $account->transactions()->create($validated);
        }

        return back();
    }

    private function createTransferPair($user, Account $source, array $data): void
    {
        $destId = $data['transfer_to_account_id'];
        $dest   = Account::findOrFail($destId);

        // Garantir que a conta destino pertence ao mesmo usuário
        abort_if($dest->user_id !== $user->id, 422, 'Conta destino não pertence ao usuário.');

        $shared = [
            'type'             => 'transfer',
            'amount_encrypted' => $data['amount_encrypted'],
            'description'      => $data['description'],
            'occurred_at'      => $data['occurred_at'],
            'category'         => null,
        ];

        // Registro na conta origem (saída)
        $outgoing = $source->transactions()->create(array_merge($shared, [
            'transfer_to_account_id' => $destId,
        ]));

        // Registro na conta destino (entrada)
        $incoming = $dest->transactions()->create(array_merge($shared, [
            'transfer_to_account_id' => $source->id,
            'transfer_pair_id'       => $outgoing->id,
        ]));

        // Vincular o registro de origem ao de entrada
        $outgoing->update(['transfer_pair_id' => $incoming->id]);
    }

    public function update(Request $request, Transaction $transaction)
    {
        abort_if($transaction->account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'type'             => 'sometimes|in:income,expense',
            'amount_encrypted' => 'sometimes|numeric|min:0.01',
            'description'      => 'sometimes|string|max:255',
            'category'         => 'nullable|string|max:100',
            'occurred_at'      => 'sometimes|date_format:Y-m-d',
        ]);

        $transaction->update($validated);

        return back();
    }

    public function destroy(Request $request, Transaction $transaction)
    {
        abort_if($transaction->account->user_id !== $request->user()->id, 403);

        // Deletar o par espelho junto
        if ($transaction->transfer_pair_id) {
            Transaction::find($transaction->transfer_pair_id)?->delete();
        }

        $transaction->delete();

        return back();
    }
}
```

---

### Task 12: Atualizar FinanceController — excluir transferências dos somas

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Alterar as somas de income/expense para excluir transferências**

Na linha em que `$monthIncome` e `$monthExpense` são calculados (aprox. linha 33-34), alterar de:

```php
$monthIncome  = (float) $monthTx->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
$monthExpense = (float) $monthTx->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);
```

Para:

```php
$monthIncome  = (float) $monthTx->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
$monthExpense = (float) $monthTx->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);
// transferências são excluídas implicitamente pois where('type', ...) não inclui 'transfer'
```

Também excluir transferências do flow chart (linhas 40-44):

```php
foreach ($allTx->whereNotIn('type', ['transfer']) as $t) {
    $key    = \Carbon\Carbon::parse($t->occurred_at)->format('Y-m');
    $amount = (float) $t->amount_encrypted;
    if ($t->type === 'income') $incomeByMonth[$key] = ($incomeByMonth[$key] ?? 0) + $amount;
    else $expenseByMonth[$key] = ($expenseByMonth[$key] ?? 0) + $amount;
}
```

E no cálculo do `current_balance` no model Account, garantir que transferências são tratadas simetricamente. Atualizar `Account.php` → `getCurrentBalanceAttribute`:

```php
public function getCurrentBalanceAttribute(): float
{
    $transactions = $this->relationLoaded('transactions')
        ? $this->transactions
        : $this->transactions()->get();

    $income  = $transactions->whereIn('type', ['income'])->sum(fn($t) => (float) $t->amount_encrypted);
    $expense = $transactions->whereIn('type', ['expense'])->sum(fn($t) => (float) $t->amount_encrypted);

    // Para transferências: o par de saída (transfer_to_account_id = outra conta) é uma saída;
    // o par de entrada (transfer_pair_id com outra conta como origem) é uma entrada.
    // O campo transfer_to_account_id na conta destino aponta para a origem — portanto é entrada.
    $transferOut = $transactions->where('type', 'transfer')
        ->filter(fn($t) => $t->transfer_to_account_id !== $this->id)
        ->sum(fn($t) => (float) $t->amount_encrypted);

    $transferIn = $transactions->where('type', 'transfer')
        ->filter(fn($t) => $t->transfer_to_account_id === $this->id)
        ->sum(fn($t) => (float) $t->amount_encrypted);

    return (float) ($this->balance_encrypted ?? 0) + $income - $expense + $transferIn - $transferOut;
}
```

---

### Task 13: Atualizar TransactionForm.tsx — aba de Transferência

**Files:**
- Modify: `resources/js/Pages/Finance/components/TransactionForm.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import CurrencyInput from '@/Components/CurrencyInput'
import { Transaction } from '@/types'

export const TRANSACTION_CATEGORIES = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
    'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
    'Investimento', 'Outros',
] as const

interface AccountOption {
    id: number
    name: string
    type: string
}

interface Props {
    accountId: number
    transaction: Transaction | null
    onClose: () => void
    accounts?: AccountOption[]         // lista de todas as contas do usuário
    budgetCategories?: string[]        // nomes das categorias de orçamento do usuário
}

function todayStr() {
    return new Date().toISOString().slice(0, 10)
}

export default function TransactionForm({ accountId, transaction, onClose, accounts = [], budgetCategories = [] }: Props) {
    const [type, setType] = useState<'income' | 'expense' | 'transfer'>(transaction?.type ?? 'expense')
    const [amount, setAmount] = useState<number>(transaction?.amount ?? 0)
    const [description, setDescription] = useState(transaction?.description ?? '')
    const [category, setCategory] = useState(transaction?.category ?? '')
    const [occurred_at, setOccurredAt] = useState(transaction?.occurred_at ?? todayStr())
    const [transferToAccountId, setTransferToAccountId] = useState<number | ''>('')

    const isNewTransaction = transaction === null
    const categoryOptions = budgetCategories.length > 0 ? budgetCategories : [...TRANSACTION_CATEGORIES]

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const data: Record<string, unknown> = {
            type,
            amount_encrypted: amount,
            description,
            occurred_at,
        }

        if (type === 'transfer') {
            data.transfer_to_account_id = transferToAccountId
        } else {
            data.category = category || null
        }

        if (isNewTransaction) {
            router.post('/finance/accounts/' + accountId + '/transactions', data, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        } else {
            router.patch('/finance/transactions/' + transaction.id, data, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        }
    }

    const otherAccounts = accounts.filter(a => a.id !== accountId)

    return (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                    {/* Type tabs */}
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
                        <div className="seg">
                            <button
                                type="button"
                                data-active={type === 'income'}
                                onClick={() => setType('income')}
                                style={type === 'income' ? { background: 'var(--green-wash)', color: 'var(--green)' } : undefined}
                            >
                                Receita
                            </button>
                            <button
                                type="button"
                                data-active={type === 'expense'}
                                onClick={() => setType('expense')}
                                style={type === 'expense' ? { background: 'oklch(40% 0.12 20 / 20%)', color: 'var(--rose)' } : undefined}
                            >
                                Despesa
                            </button>
                            {isNewTransaction && otherAccounts.length > 0 && (
                                <button
                                    type="button"
                                    data-active={type === 'transfer'}
                                    onClick={() => setType('transfer')}
                                    style={type === 'transfer' ? { background: 'oklch(40% 0.08 260 / 20%)', color: 'var(--sky)' } : undefined}
                                >
                                    Transferência
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={type === 'transfer' ? 'Ex: Reserva mensal' : 'Ex: Supermercado'}
                            required
                            className="input"
                        />
                    </div>

                    {/* Amount */}
                    <div style={{ width: 128 }}>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                        <CurrencyInput className="input" value={amount} onValueChange={setAmount} required />
                    </div>

                    {/* Transfer destination */}
                    {type === 'transfer' && (
                        <div style={{ width: 200 }}>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Conta destino</label>
                            <select
                                value={transferToAccountId}
                                onChange={e => setTransferToAccountId(Number(e.target.value))}
                                className="input"
                                required
                            >
                                <option value="">Selecionar conta</option>
                                {otherAccounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Category (hidden for transfers) */}
                    {type !== 'transfer' && (
                        <div style={{ width: 160 }}>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="input"
                            >
                                <option value="">Sem categoria</option>
                                {categoryOptions.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date */}
                    <div style={{ width: 160 }}>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
                        <input
                            type="date"
                            value={occurred_at}
                            onChange={e => setOccurredAt(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                    </div>
                </div>
            </form>
        </div>
    )
}
```

---

### Task 14: Rodar testes e commitar Checkpoint 2

- [ ] **Step 1: Rodar os testes de transferência**

```bash
docker compose exec app php artisan test tests/Feature/Finance/TransferTransactionTest.php
```

Esperado: 4 testes passando.

- [ ] **Step 2: Commitar**

```bash
git add \
  database/migrations/2026_05_15_000002_add_transfer_to_transactions.php \
  app/Domains/Finance/Models/Transaction.php \
  app/Domains/Finance/Models/Account.php \
  app/Domains/Finance/Controllers/TransactionController.php \
  app/Domains/Finance/Controllers/FinanceController.php \
  resources/js/Pages/Finance/components/TransactionForm.tsx \
  tests/Feature/Finance/TransferTransactionTest.php

git commit -m "feat: transferências entre contas sem inflar income/expense"
```

---

## Checkpoint 3: Categorias de Orçamento como Fonte da Verdade

### Task 15: Escrever o teste de linkage

**Files:**
- Create: `tests/Feature/Finance/BudgetCategoryLinkageTest.php`

- [ ] **Step 1: Criar o teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\BudgetCategory;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetCategoryLinkageTest extends TestCase
{
    use RefreshDatabase;

    public function test_budget_categories_are_passed_to_frontend()
    {
        $user = User::factory()->create();
        BudgetCategory::factory()->create(['user_id' => $user->id, 'name' => 'Alimentação', 'budget_amount_encrypted' => 1000]);
        BudgetCategory::factory()->create(['user_id' => $user->id, 'name' => 'Transporte',  'budget_amount_encrypted' => 400]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('budget_category_names')
                 ->where('budget_category_names', ['Alimentação', 'Transporte'])
        );
    }

    public function test_budget_spending_matches_transaction_category()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'balance_encrypted' => 5000]);
        BudgetCategory::factory()->create(['user_id' => $user->id, 'name' => 'Alimentação', 'budget_amount_encrypted' => 1000]);

        // Transação com categoria igual ao nome do orçamento
        $account->transactions()->create([
            'type'             => 'expense',
            'amount_encrypted' => 350,
            'description'      => 'Supermercado',
            'category'         => 'Alimentação',
            'occurred_at'      => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('budgets.0.name', 'Alimentação')
                 ->where('budgets.0.spent', 350.0)
                 ->where('budgets.0.budget', 1000.0)
                 ->where('budgets.0.pct', 35)
        );
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
docker compose exec app php artisan test tests/Feature/Finance/BudgetCategoryLinkageTest.php
```

Esperado: `test_budget_categories_are_passed_to_frontend` falhará pois `budget_category_names` não existe no Inertia props.

---

### Task 16: Criar BudgetCategory factory (se não existir)

**Files:**
- Create: `database/factories/Finance/BudgetCategoryFactory.php` (se ausente)

- [ ] **Step 1: Verificar se existe e criar se necessário**

```bash
find /home/andreon/Documentos/Vaultus/src/database/factories -name "BudgetCategory*"
```

Se não existir, criar:

```php
<?php

namespace Database\Factories\Finance;

use App\Domains\Finance\Models\BudgetCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetCategoryFactory extends Factory
{
    protected $model = BudgetCategory::class;

    public function definition(): array
    {
        return [
            'user_id'                => 1,
            'name'                   => $this->faker->word(),
            'budget_amount_encrypted'=> $this->faker->numberBetween(100, 2000),
            'color'                  => 'var(--green)',
            'position'               => 0,
        ];
    }
}
```

E adicionar `HasFactory` ao model `BudgetCategory.php` se ausente.

---

### Task 17: Passar `budget_category_names` no FinanceController

**Files:**
- Modify: `app/Domains/Finance/Controllers/FinanceController.php`

- [ ] **Step 1: Adicionar ao array do Inertia::render**

Localizar o bloco `return \Inertia\Inertia::render(...)` e adicionar uma nova prop antes do fechamento:

```php
'budget_category_names' => $budgetCategories->pluck('name')->values()->toArray(),
```

O bloco completo de retorno ficará:

```php
return \Inertia\Inertia::render('Finance/Index', [
    'net_worth'              => $netWorth,
    'month_income'           => $monthIncome,
    'month_expense'          => $monthExpense,
    'savings_rate'           => $savingsRate,
    'savings_goal_pct'       => $savingsGoalPct,
    'flow_chart'             => ['labels' => $flowLabels, 'income' => $flowIncome, 'expense' => $flowExpense],
    'donut'                  => $donut,
    'budgets'                => $budgets,
    'transactions'           => $recentTx,
    'goals'                  => $goals,
    'accounts_list'          => $accountsList,
    'upcoming_payments'      => $upcomingPayments,
    'month_label'            => $ptMonths[$now->month - 1],
    'budget_category_names'  => $budgetCategories->pluck('name')->values()->toArray(),
]);
```

---

### Task 18: Conectar budget_category_names ao TransactionForm no Index.tsx

**Files:**
- Modify: `resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Adicionar `budget_category_names` ao tipo de props e repassar ao TransactionForm**

Localizar a interface de props da página (algo como `interface Props {`) e adicionar:

```ts
budget_category_names: string[]
```

Localizar o uso de `<TransactionForm ...>` e adicionar a prop:

```tsx
<TransactionForm
    accountId={...}
    transaction={...}
    onClose={...}
    accounts={accounts_list}
    budgetCategories={budget_category_names}
/>
```

Fazer o mesmo para usos em `Account.tsx` se o formulário for usado lá também — passar `budgetCategories={[]}` como fallback seguro.

---

### Task 19: Rodar testes e commitar Checkpoint 3

- [ ] **Step 1: Rodar os testes de linkage**

```bash
docker compose exec app php artisan test tests/Feature/Finance/BudgetCategoryLinkageTest.php
```

Esperado: 2 testes passando.

- [ ] **Step 2: Rodar toda a suite do domínio**

```bash
docker compose exec app php artisan test tests/Feature/Finance/
```

Esperado: todos os testes passando.

- [ ] **Step 3: Commitar**

```bash
git add \
  app/Domains/Finance/Controllers/FinanceController.php \
  resources/js/Pages/Finance/Index.tsx \
  resources/js/Pages/Finance/components/TransactionForm.tsx \
  tests/Feature/Finance/BudgetCategoryLinkageTest.php

git commit -m "feat: categorias de orçamento como fonte da verdade no formulário de transação"
```

---

## Self-Review

**Cobertura da spec:**
- ✅ Contas crédito/empréstimo como passivos (Tasks 1-7)
- ✅ `net_worth` = ativos − passivos (Task 5)
- ✅ Transferências não inflam income/expense (Tasks 8-14)
- ✅ Exclusão de transferências no flow chart (Task 12)
- ✅ Net worth preservado após transferência (teste em Task 8)
- ✅ Categorias de orçamento no dropdown de transação (Tasks 15-18)

**Tipos consistentes entre tasks:**
- `Account.is_liability` definido em Task 3, usado em Task 5 ✅
- `Transaction.transfer_pair_id` definido em Task 9, usado em Tasks 10 e 11 ✅
- `TransactionForm.budgetCategories` prop definida em Task 13, conectada em Task 18 ✅
