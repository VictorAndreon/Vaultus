# Plano B — Página de Lançamentos com Paginação e Filtros

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a "tabela de lançamentos recentes" (8 itens fixos no dashboard) em uma página dedicada `/finance/transactions` com paginação backend (25/página), filtros dinâmicos por tipo/conta/categoria/range de datas (incluindo ano) e busca textual com debounce. URL é a fonte da verdade dos filtros, permitindo bookmark e compartilhamento.

**Architecture:** Rota nova `GET /finance/transactions` servida por `TransactionController::index`. Lógica de query encapsulada em `TransactionListingQuery` (Action class) que recebe um `TransactionFilters` Value Object construído a partir da request. Página React `Pages/Finance/Transactions.tsx` consome `LengthAwarePaginator` do Laravel via Inertia, com componente `<TransactionFilters />` que dispara reload parcial (`only: ['transactions']`) a cada mudança. Índices SQL adicionados para suportar os filtros sem table scan.

**Tech Stack:** Laravel 11, Eloquent, Inertia.js partial reloads, React 18, TypeScript, PHPUnit

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `database/migrations/2026_05_17_000001_add_indexes_to_transactions.php` |
| Criar | `app/Domains/Finance/Queries/TransactionFilters.php` |
| Criar | `app/Domains/Finance/Queries/TransactionListingQuery.php` |
| Modificar | `app/Domains/Finance/Controllers/TransactionController.php` |
| Modificar | `app/Http/Resources/TransactionResource.php` |
| Modificar | `routes/web.php` |
| Modificar | `resources/js/Pages/Finance/Index.tsx` (teaser com link "Ver tudo") |
| Criar | `resources/js/Pages/Finance/Transactions.tsx` |
| Criar | `resources/js/Pages/Finance/components/TransactionFilters.tsx` |
| Criar | `resources/js/Pages/Finance/components/TransactionsTable.tsx` |
| Modificar | `resources/js/Pages/Finance/components/TransactionList.tsx` (remover — agora orfão) |
| Criar | `resources/js/lib/useDebouncedEffect.ts` |
| Criar | `tests/Feature/Finance/TransactionListingTest.php` |

---

## Checkpoint 1: Backend — Query, Filtros e Índices

### Task 1: Escrever teste para listagem com filtros

**Files:**
- Create: `tests/Feature/Finance/TransactionListingTest.php`

- [ ] **Step 1: Criar o arquivo de teste**

```php
<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_paginates_25_per_page()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        for ($i = 0; $i < 30; $i++) {
            $account->transactions()->create([
                'type'             => 'expense',
                'amount_encrypted' => 10 + $i,
                'description'      => 'Tx ' . $i,
                'occurred_at'      => '2026-05-' . str_pad((string) (($i % 28) + 1), 2, '0', STR_PAD_LEFT),
            ]);
        }

        $response = $this->actingAs($user)->get('/finance/transactions');

        $response->assertInertia(fn ($p) =>
            $p->component('Finance/Transactions')
              ->has('transactions.data', 25)
              ->where('transactions.last_page', 2)
              ->where('transactions.current_page', 1)
        );
    }

    public function test_filter_by_type_returns_only_matching_transactions()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $account->transactions()->create(['type' => 'income',  'amount_encrypted' => 1000, 'description' => 'Salário', 'occurred_at' => '2026-05-01']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 50,   'description' => 'Mercado', 'occurred_at' => '2026-05-02']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 30,   'description' => 'Uber',    'occurred_at' => '2026-05-03']);

        $response = $this->actingAs($user)->get('/finance/transactions?types=expense');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 2)
              ->where('transactions.data.0.type', 'expense')
        );
    }

    public function test_filter_by_account_returns_only_owned_account()
    {
        $user = User::factory()->create();
        $a1   = Account::factory()->create(['user_id' => $user->id, 'name' => 'Conta A']);
        $a2   = Account::factory()->create(['user_id' => $user->id, 'name' => 'Conta B']);

        $a1->transactions()->create(['type' => 'expense', 'amount_encrypted' => 10, 'description' => 'A', 'occurred_at' => '2026-05-01']);
        $a2->transactions()->create(['type' => 'expense', 'amount_encrypted' => 20, 'description' => 'B', 'occurred_at' => '2026-05-02']);

        $response = $this->actingAs($user)->get('/finance/transactions?account_ids=' . $a1->id);

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', 'A')
        );
    }

    public function test_filter_by_date_range_respects_year()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Antiga', 'occurred_at' => '2024-12-15']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 2, 'description' => '2026',  'occurred_at' => '2026-03-01']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 3, 'description' => 'Recente','occurred_at' => '2026-05-10']);

        $response = $this->actingAs($user)
            ->get('/finance/transactions?date_from=2026-01-01&date_to=2026-04-30');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', '2026')
        );
    }

    public function test_search_matches_description_case_insensitive()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'NETFLIX assinatura', 'occurred_at' => '2026-05-01']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Padaria',           'occurred_at' => '2026-05-02']);

        $response = $this->actingAs($user)->get('/finance/transactions?search=netflix');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', 'NETFLIX assinatura')
        );
    }

    public function test_listing_excludes_other_users_transactions()
    {
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        $a1 = Account::factory()->create(['user_id' => $u1->id]);
        $a2 = Account::factory()->create(['user_id' => $u2->id]);

        $a1->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Mine',  'occurred_at' => '2026-05-01']);
        $a2->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Yours', 'occurred_at' => '2026-05-02']);

        $response = $this->actingAs($u1)->get('/finance/transactions');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', 'Mine')
        );
    }

    public function test_filters_persist_via_query_string_in_pagination_links()
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        for ($i = 0; $i < 30; $i++) {
            $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Tx ' . $i, 'occurred_at' => '2026-05-' . str_pad((string) (($i % 28) + 1), 2, '0', STR_PAD_LEFT)]);
        }

        $response = $this->actingAs($user)->get('/finance/transactions?types=expense');

        $response->assertInertia(fn ($p) =>
            $p->where('transactions.next_page_url', fn ($url) => str_contains($url ?? '', 'types=expense'))
        );
    }
}
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `docker compose exec app php artisan test --filter=TransactionListingTest`
Expected: FAIL — rota `/finance/transactions` ainda não existe (404).

---

### Task 2: Criar Value Object `TransactionFilters`

**Files:**
- Create: `app/Domains/Finance/Queries/TransactionFilters.php`

- [ ] **Step 1: Criar o VO**

```php
<?php

namespace App\Domains\Finance\Queries;

use Illuminate\Http\Request;

final class TransactionFilters
{
    /**
     * @param  string[]  $types        ex: ['income','expense','transfer']
     * @param  int[]     $accountIds
     * @param  string[]  $categories
     */
    public function __construct(
        public readonly array $types       = [],
        public readonly array $accountIds  = [],
        public readonly array $categories  = [],
        public readonly ?string $dateFrom  = null,
        public readonly ?string $dateTo    = null,
        public readonly ?string $search    = null,
    ) {}

    public static function fromRequest(Request $r): self
    {
        $explode = fn (?string $v) => $v ? array_values(array_filter(array_map('trim', explode(',', $v)))) : [];

        return new self(
            types:      $explode($r->query('types')),
            accountIds: array_map('intval', $explode($r->query('account_ids'))),
            categories: $explode($r->query('categories')),
            dateFrom:   self::parseDate($r->query('date_from')),
            dateTo:     self::parseDate($r->query('date_to')),
            search:     $r->query('search') ? trim((string) $r->query('search')) : null,
        );
    }

    public function toArray(): array
    {
        return [
            'types'       => $this->types,
            'account_ids' => $this->accountIds,
            'categories'  => $this->categories,
            'date_from'   => $this->dateFrom,
            'date_to'     => $this->dateTo,
            'search'      => $this->search,
        ];
    }

    private static function parseDate(?string $v): ?string
    {
        if (! $v) return null;
        try {
            return \Carbon\Carbon::createFromFormat('Y-m-d', $v)->toDateString();
        } catch (\Exception) {
            return null;
        }
    }
}
```

---

### Task 3: Criar `TransactionListingQuery`

**Files:**
- Create: `app/Domains/Finance/Queries/TransactionListingQuery.php`

- [ ] **Step 1: Criar a query**

```php
<?php

namespace App\Domains\Finance\Queries;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TransactionListingQuery
{
    public function paginate(User $user, TransactionFilters $f, int $perPage = 25): LengthAwarePaginator
    {
        return Transaction::query()
            ->whereHas('account', fn ($q) => $q->where('user_id', $user->id))
            ->when($f->types,        fn ($q, $types)   => $q->whereIn('type', $types))
            ->when($f->accountIds,   fn ($q, $ids)     => $q->whereIn('account_id', $ids))
            ->when($f->categories,   fn ($q, $cats)    => $q->whereIn('category', $cats))
            ->when($f->dateFrom,     fn ($q, $d)       => $q->where('occurred_at', '>=', $d))
            ->when($f->dateTo,       fn ($q, $d)       => $q->where('occurred_at', '<=', $d))
            ->when($f->search,       fn ($q, $s)       => $q->where('description', 'like', "%{$s}%"))
            ->with(['account:id,name,type'])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();
    }
}
```

---

### Task 4: Adicionar método `index` ao `TransactionController`

**Files:**
- Modify: `app/Domains/Finance/Controllers/TransactionController.php`

- [ ] **Step 1: Adicionar o método antes de `store()`**

```php
public function index(Request $request, \App\Domains\Finance\Queries\TransactionListingQuery $query)
{
    $user    = $request->user();
    $filters = \App\Domains\Finance\Queries\TransactionFilters::fromRequest($request);

    $transactions = $query->paginate($user, $filters);

    $accounts = $user->accounts()->userVisible()->get(['id', 'name', 'type']);

    return \Inertia\Inertia::render('Finance/Transactions', [
        'transactions' => \App\Http\Resources\TransactionResource::collection($transactions),
        'filters'      => $filters->toArray(),
        'accounts'     => $accounts,
        'categories'   => $user->budgetCategories()->pluck('name')->values(),
    ]);
}
```

> Nota: `userVisible()` é o scope criado no Plano A. Se Plano A ainda não foi mergeado, trocar por `->where('is_internal', false)` ou omitir o filtro temporariamente.

- [ ] **Step 2: Atualizar import no topo do arquivo**

Adicionar:
```php
use Illuminate\Http\Request;
```
(já presente) — não é necessário.

---

### Task 5: Atualizar `TransactionResource` para incluir dados do account

**Files:**
- Modify: `app/Http/Resources/TransactionResource.php`

- [ ] **Step 1: Verificar conteúdo atual e ajustar**

Substituir o método `toArray` por:

```php
public function toArray($request): array
{
    return [
        'id'          => $this->id,
        'type'        => $this->type,
        'amount'      => (float) $this->amount_encrypted,
        'description' => $this->description,
        'category'    => $this->category,
        'occurred_at' => $this->occurred_at?->toDateString(),
        'account'     => $this->whenLoaded('account', fn () => [
            'id'   => $this->account->id,
            'name' => $this->account->name,
            'type' => $this->account->type,
        ]),
        'is_transfer'              => $this->type === 'transfer',
        'transfer_to_account_id'   => $this->transfer_to_account_id,
        'transfer_pair_id'         => $this->transfer_pair_id,
    ];
}
```

---

### Task 6: Adicionar rota `GET /finance/transactions`

**Files:**
- Modify: `routes/web.php`

- [ ] **Step 1: Adicionar a rota antes das rotas de `accounts/{account}/transactions`**

```php
Route::get('/finance/transactions', [TransactionController::class, 'index'])->name('finance.transactions');
```

- [ ] **Step 2: Rodar testes para verificar progresso**

Run: `docker compose exec app php artisan test --filter=TransactionListingTest`
Expected: alguns testes passam; pode falhar em `assertInertia(fn ($p) => $p->component('Finance/Transactions'))` porque a página React ainda não existe. Inertia renderiza componentes não encontrados como erro 500. Mover para próximo passo.

---

### Task 7: Criar migration de índices

**Files:**
- Create: `database/migrations/2026_05_17_000001_add_indexes_to_transactions.php`

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
            $table->index(['account_id', 'occurred_at'], 'transactions_account_id_occurred_at_idx');
            $table->index(['account_id', 'type'],        'transactions_account_id_type_idx');
            $table->index(['occurred_at'],               'transactions_occurred_at_idx');
            $table->index(['category'],                  'transactions_category_idx');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_account_id_occurred_at_idx');
            $table->dropIndex('transactions_account_id_type_idx');
            $table->dropIndex('transactions_occurred_at_idx');
            $table->dropIndex('transactions_category_idx');
        });
    }
};
```

- [ ] **Step 2: Rodar a migration**

Run: `docker compose exec app php artisan migrate`
Expected: `Migrated: 2026_05_17_000001_add_indexes_to_transactions`

---

### Task 8: Commitar Checkpoint 1

- [ ] **Step 1: Commitar**

```bash
git add database/migrations/2026_05_17_000001_add_indexes_to_transactions.php \
        app/Domains/Finance/Queries/TransactionFilters.php \
        app/Domains/Finance/Queries/TransactionListingQuery.php \
        app/Domains/Finance/Controllers/TransactionController.php \
        app/Http/Resources/TransactionResource.php \
        routes/web.php \
        tests/Feature/Finance/TransactionListingTest.php
git commit -m "feat(finance): backend de listagem de lançamentos com filtros e paginação"
```

---

## Checkpoint 2: Frontend — Página dedicada com filtros dinâmicos

### Task 9: Criar hook `useDebouncedEffect`

**Files:**
- Create: `resources/js/lib/useDebouncedEffect.ts`

- [ ] **Step 1: Criar o hook**

```ts
import { useEffect, type DependencyList } from 'react'

export function useDebouncedEffect(effect: () => void | (() => void), deps: DependencyList, delayMs: number) {
  useEffect(() => {
    const handle = setTimeout(() => effect(), delayMs)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs])
}
```

---

### Task 10: Criar componente `<TransactionFilters />`

**Files:**
- Create: `resources/js/Pages/Finance/components/TransactionFilters.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useState } from 'react'

export interface FilterState {
  types: string[]
  accountIds: number[]
  categories: string[]
  dateFrom: string
  dateTo: string
  search: string
}

interface AccountOption { id: number; name: string; type: string }

interface Props {
  initial: FilterState
  accounts: AccountOption[]
  categories: string[]
  onChange: (s: FilterState) => void
}

const TYPE_OPTIONS = [
  { value: 'income',   label: 'Receitas' },
  { value: 'expense',  label: 'Despesas' },
  { value: 'transfer', label: 'Transferências' },
]

export default function TransactionFilters({ initial, accounts, categories, onChange }: Props) {
  const [state, setState] = useState<FilterState>(initial)

  function patch(p: Partial<FilterState>) {
    const next = { ...state, ...p }
    setState(next)
    onChange(next)
  }

  function toggleType(t: string) {
    const set = new Set(state.types)
    set.has(t) ? set.delete(t) : set.add(t)
    patch({ types: Array.from(set) })
  }

  function toggleAccount(id: number) {
    const set = new Set(state.accountIds)
    set.has(id) ? set.delete(id) : set.add(id)
    patch({ accountIds: Array.from(set) })
  }

  function toggleCategory(c: string) {
    const set = new Set(state.categories)
    set.has(c) ? set.delete(c) : set.add(c)
    patch({ categories: Array.from(set) })
  }

  function clearAll() {
    const empty: FilterState = { types: [], accountIds: [], categories: [], dateFrom: '', dateTo: '', search: '' }
    setState(empty)
    onChange(empty)
  }

  const hasFilters =
    state.types.length || state.accountIds.length || state.categories.length ||
    state.dateFrom || state.dateTo || state.search

  return (
    <div className="card" style={{ padding: 18, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Linha 1: busca + datas */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Buscar</label>
          <input
            type="search"
            className="input"
            placeholder="Descrição contém..."
            value={state.search}
            onChange={e => patch({ search: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>De</label>
          <input
            type="date"
            className="input"
            value={state.dateFrom}
            onChange={e => patch({ dateFrom: e.target.value })}
          />
        </div>
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Até</label>
          <input
            type="date"
            className="input"
            value={state.dateTo}
            onChange={e => patch({ dateTo: e.target.value })}
          />
        </div>
        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Linha 2: tipo */}
      <div>
        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {TYPE_OPTIONS.map(t => {
            const active = state.types.includes(t.value)
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleType(t.value)}
                className="btn btn-ghost btn-sm"
                style={{
                  background: active ? 'color-mix(in oklab, var(--green) 14%, transparent)' : undefined,
                  borderColor: active ? 'color-mix(in oklab, var(--green) 50%, transparent)' : undefined,
                  color: active ? 'var(--green)' : undefined,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Linha 3: contas */}
      {accounts.length > 0 && (
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Contas</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {accounts.map(a => {
              const active = state.accountIds.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAccount(a.id)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    background: active ? 'color-mix(in oklab, var(--sky) 14%, transparent)' : undefined,
                    borderColor: active ? 'color-mix(in oklab, var(--sky) 50%, transparent)' : undefined,
                    color: active ? 'var(--sky)' : undefined,
                  }}
                >
                  {a.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Linha 4: categorias */}
      {categories.length > 0 && (
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categorias</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(c => {
              const active = state.categories.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    background: active ? 'color-mix(in oklab, var(--gold) 14%, transparent)' : undefined,
                    borderColor: active ? 'color-mix(in oklab, var(--gold) 50%, transparent)' : undefined,
                    color: active ? 'var(--gold)' : undefined,
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### Task 11: Criar componente `<TransactionsTable />`

**Files:**
- Create: `resources/js/Pages/Finance/components/TransactionsTable.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'

interface AccountRef { id: number; name: string; type: string }

export interface ListedTransaction {
  id: number
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  category: string | null
  occurred_at: string
  account: AccountRef | null
  is_transfer: boolean
}

interface PaginatedTransactions {
  data: ListedTransaction[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  next_page_url: string | null
  prev_page_url: string | null
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function TransactionsTable({ transactions }: { transactions: PaginatedTransactions }) {
  function go(url: string | null) {
    if (!url) return
    router.get(url, {}, { preserveScroll: true, preserveState: true })
  }

  function handleDelete(id: number) {
    if (!confirm('Excluir esta transação?')) return
    router.delete('/finance/transactions/' + id, { preserveScroll: true })
  }

  if (transactions.data.length === 0) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
        Nenhuma transação encontrada com os filtros atuais.
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 160px 110px 60px', padding: '10px 22px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
        <div>Data</div>
        <div>Descrição</div>
        <div>Categoria</div>
        <div>Conta</div>
        <div style={{ textAlign: 'right' }}>Valor</div>
        <div></div>
      </div>

      {transactions.data.map((t, i) => {
        const sign  = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔'
        const color = t.type === 'income' ? 'var(--green)' : t.type === 'expense' ? 'var(--rose)' : 'var(--text-3)'
        return (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 160px 110px 60px', padding: '12px 22px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13 }}>
            <div className="mono muted" style={{ fontSize: 11 }}>{fmtDate(t.occurred_at)}</div>
            <div style={{ color: 'var(--text-2)', fontWeight: 500 }}>{t.description}</div>
            <div className="muted">{t.category ?? '—'}</div>
            <div className="muted mono" style={{ fontSize: 11 }}>{t.account?.name ?? '—'}</div>
            <div className="mono" style={{ textAlign: 'right', color, fontWeight: 600 }}>
              {sign} {fmtBRL(Math.abs(t.amount))}
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              {!t.is_transfer && (
                <button className="icon-btn" style={{ width: 24, height: 24, color: 'var(--rose)' }} aria-label="Excluir transação" onClick={() => handleDelete(t.id)}>
                  <Icons.Trash size={11} />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Paginação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1px solid var(--line-soft)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
          {transactions.total} resultados · página {transactions.current_page} de {transactions.last_page}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" disabled={!transactions.prev_page_url} onClick={() => go(transactions.prev_page_url)}>
            ← Anterior
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!transactions.next_page_url} onClick={() => go(transactions.next_page_url)}>
            Próxima →
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 12: Criar página `Pages/Finance/Transactions.tsx`

**Files:**
- Create: `resources/js/Pages/Finance/Transactions.tsx`

- [ ] **Step 1: Criar a página**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import TransactionFilters, { FilterState } from './components/TransactionFilters'
import TransactionsTable from './components/TransactionsTable'
import { useDebouncedEffect } from '@/lib/useDebouncedEffect'

interface AccountOption { id: number; name: string; type: string }

interface Props {
  transactions: {
    data: any[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    next_page_url: string | null
    prev_page_url: string | null
  }
  filters: {
    types: string[]
    account_ids: number[]
    categories: string[]
    date_from: string | null
    date_to: string | null
    search: string | null
  }
  accounts: AccountOption[]
  categories: string[]
}

export default function TransactionsPage({ transactions, filters, accounts, categories }: Props) {
  const initial: FilterState = {
    types:      filters.types ?? [],
    accountIds: filters.account_ids ?? [],
    categories: filters.categories ?? [],
    dateFrom:   filters.date_from ?? '',
    dateTo:     filters.date_to ?? '',
    search:     filters.search ?? '',
  }

  const [state, setState] = useState<FilterState>(initial)

  useDebouncedEffect(() => {
    router.get('/finance/transactions', {
      types:        state.types.join(',') || undefined,
      account_ids:  state.accountIds.join(',') || undefined,
      categories:   state.categories.join(',') || undefined,
      date_from:    state.dateFrom || undefined,
      date_to:      state.dateTo || undefined,
      search:       state.search || undefined,
    }, {
      preserveScroll: true,
      preserveState:  true,
      replace:        true,
      only:           ['transactions', 'filters'],
    })
  }, [state.types, state.accountIds, state.categories, state.dateFrom, state.dateTo, state.search], 300)

  return (
    <AppLayout title="Lançamentos" eyebrow="Finanças" subtitle="Histórico completo com filtros e busca.">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <TransactionFilters
          initial={state}
          accounts={accounts}
          categories={categories}
          onChange={setState}
        />
        <TransactionsTable transactions={transactions} />
      </div>
    </AppLayout>
  )
}
```

---

### Task 13: Adicionar teaser e link "Ver tudo" no `Pages/Finance/Index.tsx`

**Files:**
- Modify: `resources/js/Pages/Finance/Index.tsx` (seção "Tabela de lançamentos", linhas 995-1017)

- [ ] **Step 1: Substituir o cabeçalho do card de lançamentos**

Trocar:
```tsx
<div className="card" style={{ padding: 0 }}>
  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div className="card-title">Lançamentos recentes</div>
  </div>
```

Por:
```tsx
<div className="card" style={{ padding: 0 }}>
  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div className="card-title">Lançamentos recentes</div>
    <Link href="/finance/transactions" className="btn btn-ghost btn-sm">
      Ver tudo →
    </Link>
  </div>
```

> Nota: `Link` já está importado no topo do arquivo (linha 2). Se não estiver, adicionar: `import { router, Link } from '@inertiajs/react'`.

---

### Task 14: Rodar testes backend + smoke test frontend

- [ ] **Step 1: Backend**

Run: `docker compose exec app php artisan test --filter=TransactionListingTest`
Expected: All PASS.

- [ ] **Step 2: Frontend dev server**

Run: `docker compose exec app npm run dev`

- [ ] **Step 3: Smoke test em `https://vaultus.local/finance/transactions`**

Verificar:
- (a) Página carrega com 25 lançamentos por página.
- (b) Filtro por tipo "Despesas" reduz a lista; URL ganha `?types=expense`.
- (c) Selecionar período "01/01/2026 → 30/04/2026" filtra corretamente.
- (d) Busca textual com debounce de 300ms funciona (não dispara request a cada tecla).
- (e) Botão "Próxima" navega para página 2 preservando filtros na querystring.
- (f) Clicar "Limpar filtros" volta para a lista completa, querystring limpa.
- (g) Link "Ver tudo →" do dashboard leva para a página.

---

### Task 15: Excluir `TransactionList.tsx` órfão

**Files:**
- Delete: `resources/js/Pages/Finance/components/TransactionList.tsx`

- [ ] **Step 1: Confirmar que ninguém importa o componente**

Run: `grep -rn "from.*TransactionList" /home/andreon/Documentos/Vaultus/src/resources/js/ || echo "no imports"`
Expected: `no imports`

- [ ] **Step 2: Excluir o arquivo**

Run: `rm /home/andreon/Documentos/Vaultus/src/resources/js/Pages/Finance/components/TransactionList.tsx`

---

### Task 16: Commitar Checkpoint 2

- [ ] **Step 1: Commitar**

```bash
git add resources/js/lib/useDebouncedEffect.ts \
        resources/js/Pages/Finance/Transactions.tsx \
        resources/js/Pages/Finance/components/TransactionFilters.tsx \
        resources/js/Pages/Finance/components/TransactionsTable.tsx \
        resources/js/Pages/Finance/Index.tsx
git rm resources/js/Pages/Finance/components/TransactionList.tsx
git commit -m "feat(finance): página de lançamentos com filtros dinâmicos e paginação"
```

---

## Critérios de Conclusão

- [ ] `php artisan test --filter=TransactionListingTest` passa (7 testes).
- [ ] Página `/finance/transactions` carrega no navegador e respeita os 7 cenários de smoke test (Task 14).
- [ ] Filtros refletem na URL e sobrevivem a refresh.
- [ ] Paginação preserva filtros nos links (assertion `next_page_url contém types=expense`).
- [ ] `TransactionList.tsx` órfão foi removido.

## Riscos & Mitigações

| Risco | Mitigação |
|-------|-----------|
| Like com `%search%` faz table scan mesmo com índice em `description` | Para o volume atual (centenas/milhares de tx), aceitável. Se virar problema, adotar `Laravel Scout` ou `tsvector` (Postgres). |
| Debounce de 300ms cria "double request" se usuário pula filtro rápido | `replace: true` no `router.get` impede acúmulo de history; `preserveState` evita reset de cursor. |
| Filtros com `goal` (subconta) aparecendo após Plano A | `accounts` no controller usa `userVisible()`, então subcontas não aparecem como opção. Transferências (`type=transfer`) podem incluir contas de meta, mas o filtro de conta lista só as visíveis. |
| Busca por strings com `%` (LIKE injection) | Eloquent já escapa parameters via bindings. Sem risco de SQL injection. |
