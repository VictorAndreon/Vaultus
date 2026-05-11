# Fase 4 — Finanças Pessoais

**Data:** 2026-05-11
**Status:** Aprovado

## Objetivo

Implementar o módulo de finanças com contas bancárias, transações (income/expense), metas financeiras com aporte via transações e wishlist vinculada a metas. Todos os valores monetários permanecem criptografados em repouso via `EncryptedCast`.

---

## Decisões de Design

| Decisão | Escolha |
|---|---|
| Saldo da conta | `balance_encrypted` (inicial) + `SUM(transactions)` — nunca atualiza o campo após criação |
| Navegação | `/finance` como hub de contas + metas + wishlist; `/finance/accounts/{id}` para detalhe |
| Categorias | Lista predefinida como sugestão autocomplete + texto livre aceito |
| Metas | Progresso calculado via `transaction_goal.amount_encrypted` |
| Transferências | Fora do escopo da Fase 4 (apenas `income` e `expense`) |
| Wishlist | Vinculável a uma `FinancialGoal` via `financial_goal_id` |

---

## Arquitetura

### Rotas

```
GET    /finance                                          → FinanceController::index
GET    /finance/accounts/{account}                       → AccountController::show
POST   /finance/accounts                                 → AccountController::store
PATCH  /finance/accounts/{account}                       → AccountController::update
DELETE /finance/accounts/{account}                       → AccountController::destroy
POST   /finance/accounts/{account}/transactions          → TransactionController::store
PATCH  /finance/transactions/{transaction}               → TransactionController::update
DELETE /finance/transactions/{transaction}               → TransactionController::destroy
POST   /finance/goals                                    → GoalController::store
PATCH  /finance/goals/{goal}                             → GoalController::update
DELETE /finance/goals/{goal}                             → GoalController::destroy
POST   /finance/wishlist                                 → WishlistController::store
PATCH  /finance/wishlist/{item}                          → WishlistController::update
DELETE /finance/wishlist/{item}                          → WishlistController::destroy
POST   /finance/transactions/{transaction}/allocations   → TransactionGoalController::store
DELETE /finance/allocations/{allocation}                 → TransactionGoalController::destroy
```

### Controllers

| Controller | Responsabilidade |
|---|---|
| `FinanceController` | `index` — agrega contas com saldos, metas, wishlist para `/finance` |
| `AccountController` | `show/store/update/destroy` — CRUD de contas + detalhe com transações |
| `TransactionController` | `store/update/destroy` — CRUD de transações |
| `GoalController` | `store/update/destroy` — CRUD de metas financeiras |
| `WishlistController` | `store/update/destroy` — CRUD de itens da wishlist |
| `TransactionGoalController` | `store/destroy` — vincula/desvincula transação a meta |

---

## Models

### Account
- **Tabela:** `accounts`
- **Campos:** `user_id`, `name`, `type` (checking/savings/investment/cash), `balance_encrypted`, `currency`
- **Accessor:** `current_balance` = `balance_encrypted (float) + SUM(income) − SUM(expense)` via relação `transactions`
- **Soft deletes:** sim

### Transaction
- **Tabela:** `transactions`
- **Campos:** `account_id`, `type` (`income`|`expense`), `amount_encrypted`, `description`, `category`, `occurred_at`
- **Cast:** `amount_encrypted → EncryptedCast`, `occurred_at → date`
- **Soft deletes:** sim

### FinancialGoal
- **Tabela:** `financial_goals`
- **Campos:** `user_id`, `name`, `target_amount_encrypted`, `current_amount_encrypted` (não usado — mantido para compatibilidade), `category`, `deadline`, `is_completed`, `is_archived`
- **Accessor:** `current_amount` = `SUM(transactionGoals.amount_encrypted)` (dinâmico)
- **Accessor:** `progress_percent` = `min(100, current_amount / target_amount * 100)`
- **Soft deletes:** sim

### WishlistItem
- **Tabela:** `wishlist_items`
- **Campos:** `user_id`, `financial_goal_id` (nullable), `name`, `estimated_price_encrypted`, `priority` (low/medium/high), `url`, `notes`
- **Relação:** `belongsTo(FinancialGoal)` (opcional)
- **Soft deletes:** sim

### TransactionGoal
- **Tabela:** `transaction_goal`
- **Campos:** `transaction_id`, `financial_goal_id`, `amount_encrypted`
- **Cast:** `amount_encrypted → EncryptedCast`
- **Model explícito** (não pivot simples, pois tem `amount_encrypted`)

---

## Resources (serialização)

| Resource | Campos expostos |
|---|---|
| `AccountResource` | `id`, `name`, `type`, `currency`, `current_balance` (float) |
| `TransactionResource` | `id`, `account_id`, `type`, `amount` (float), `description`, `category`, `occurred_at` |
| `FinancialGoalResource` | `id`, `name`, `target_amount`, `current_amount`, `progress_percent`, `category`, `deadline`, `is_completed`, `is_archived` |
| `WishlistItemResource` | `id`, `name`, `estimated_price`, `priority`, `url`, `notes`, `financial_goal_id`, `goal` (whenLoaded) |
| `TransactionGoalResource` | `id`, `transaction_id`, `financial_goal_id`, `amount` |

**Nota:** nenhum Resource expõe campos `*_encrypted` raw.

---

## Frontend

### Páginas

**`Finance/Index.tsx`** — props: `accounts`, `goals`, `wishlist`, `net_worth`
- Coluna esquerda: lista de `AccountCard` + botão "Nova conta"
- Coluna direita: abas "Metas" e "Wishlist"
  - Metas: `GoalCard` com barra de progresso e deadline
  - Wishlist: `WishlistCard` com prioridade colorida e meta associada

**`Finance/Account.tsx`** — props: `account`, `transactions` (paginado, 25/página)
- Header com nome da conta, tipo e `current_balance` em destaque
- Formulário inline colapsável para nova transação
- `TransactionList` com filtro por tipo/categoria, paginação lazy

### Componentes

```
Finance/components/
  AccountCard.tsx         — card de conta com saldo atual
  AccountForm.tsx         — modal criar/editar conta
  TransactionList.tsx     — lista com filtros (tipo, categoria)
  TransactionForm.tsx     — formulário inline de transação
  GoalCard.tsx            — card com progress bar + modal de alocação
  GoalForm.tsx            — modal CRUD de meta
  WishlistCard.tsx        — card de item da wishlist
  WishlistForm.tsx        — modal CRUD de wishlist
```

### Tipos TypeScript

```typescript
interface Account {
    id: number
    name: string
    type: string
    currency: string
    current_balance: number
}

interface Transaction {
    id: number
    account_id: number
    type: 'income' | 'expense'
    amount: number
    description: string
    category: string | null
    occurred_at: string
}

interface FinancialGoal {
    id: number
    name: string
    target_amount: number
    current_amount: number
    progress_percent: number
    category: string | null
    deadline: string | null
    is_completed: boolean
    is_archived: boolean
}

interface WishlistItem {
    id: number
    name: string
    estimated_price: number | null
    priority: 'low' | 'medium' | 'high'
    url: string | null
    notes: string | null
    financial_goal_id: number | null
    goal: FinancialGoal | null
}
```

### Categorias Predefinidas

```php
// PHP
const TRANSACTION_CATEGORIES = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
    'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
    'Investimento', 'Outros',
];
```

```typescript
// TypeScript (espelhado)
export const TRANSACTION_CATEGORIES = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
    'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
    'Investimento', 'Outros',
] as const
```

---

## Dashboard

`DashboardAggregator::getStats` recebe novo campo:

```php
'net_worth' => $user->accounts()->get()->sum(fn($a) => $a->current_balance),
```

`QuickStats.tsx` exibe card "Patrimônio" com `net_worth` formatado em BRL.

---

## Testes (TDD)

| Arquivo | Casos |
|---|---|
| `AccountTest.php` | requires auth, renders props, create, update, delete, cannot access other user's |
| `TransactionTest.php` | create income, create expense, update, delete, cannot modify other user's, balance reflects transactions |
| `GoalTest.php` | create, update, delete, cannot modify other user's |
| `WishlistTest.php` | create, update, delete, link to goal, cannot modify other user's |
| `TransactionGoalTest.php` | allocate, delete allocation, cannot allocate to other user's goal |

~25 testes no total. Nenhum mock de banco — todos usam `RefreshDatabase`.

---

## Segurança

- `abort_if($resource->user_id !== $request->user()->id, 403)` em todos os controllers
- `Rule::in(['checking', 'savings', 'investment', 'cash'])` na validação de `type` em `AccountController`
- `Rule::in(['income', 'expense'])` na validação de `type` em `TransactionController`
- `Rule::in(['low', 'medium', 'high'])` na validação de `priority` em `WishlistController`
- Nenhum campo `*_encrypted` exposto em Resources ou props Inertia

---

## Mapa de Arquivos

### Criar
| Arquivo | Responsabilidade |
|---|---|
| `app/Domains/Finance/Models/Account.php` | Model com accessor current_balance |
| `app/Domains/Finance/Models/Transaction.php` | Model com EncryptedCast |
| `app/Domains/Finance/Models/FinancialGoal.php` | Model com accessors current_amount e progress_percent |
| `app/Domains/Finance/Models/WishlistItem.php` | Model com EncryptedCast |
| `app/Domains/Finance/Models/TransactionGoal.php` | Model pivot com amount_encrypted |
| `app/Domains/Finance/Controllers/FinanceController.php` | index |
| `app/Domains/Finance/Controllers/AccountController.php` | show, store, update, destroy |
| `app/Domains/Finance/Controllers/TransactionController.php` | store, update, destroy |
| `app/Domains/Finance/Controllers/GoalController.php` | store, update, destroy |
| `app/Domains/Finance/Controllers/WishlistController.php` | store, update, destroy |
| `app/Domains/Finance/Controllers/TransactionGoalController.php` | store, destroy |
| `app/Http/Resources/AccountResource.php` | serialização |
| `app/Http/Resources/TransactionResource.php` | serialização |
| `app/Http/Resources/FinancialGoalResource.php` | serialização |
| `app/Http/Resources/WishlistItemResource.php` | serialização |
| `app/Http/Resources/TransactionGoalResource.php` | serialização |
| `tests/Feature/Finance/AccountTest.php` | feature tests contas |
| `tests/Feature/Finance/TransactionTest.php` | feature tests transações |
| `tests/Feature/Finance/GoalTest.php` | feature tests metas |
| `tests/Feature/Finance/WishlistTest.php` | feature tests wishlist |
| `tests/Feature/Finance/TransactionGoalTest.php` | feature tests alocações |
| `resources/js/Pages/Finance/Index.tsx` | página principal |
| `resources/js/Pages/Finance/Account.tsx` | página de detalhe da conta |
| `resources/js/Pages/Finance/components/AccountCard.tsx` | card de conta |
| `resources/js/Pages/Finance/components/AccountForm.tsx` | modal CRUD conta |
| `resources/js/Pages/Finance/components/TransactionList.tsx` | lista filtrada |
| `resources/js/Pages/Finance/components/TransactionForm.tsx` | formulário inline |
| `resources/js/Pages/Finance/components/GoalCard.tsx` | card de meta |
| `resources/js/Pages/Finance/components/GoalForm.tsx` | modal CRUD meta |
| `resources/js/Pages/Finance/components/WishlistCard.tsx` | card de wishlist |
| `resources/js/Pages/Finance/components/WishlistForm.tsx` | modal CRUD wishlist |

### Modificar
| Arquivo | O que muda |
|---|---|
| `routes/web.php` | Remover `finance` dos stubs, adicionar 16 rotas reais |
| `app/Domains/Auth/Models/User.php` | Adicionar `accounts()`, `financialGoals()`, `wishlistItems()` |
| `app/Domains/Dashboard/Services/DashboardAggregator.php` | Adicionar `net_worth` |
| `resources/js/Pages/Dashboard/Index.tsx` | Atualizar tipo da prop `stats` |
| `resources/js/Pages/Dashboard/widgets/QuickStats.tsx` | Exibir `net_worth` formatado |
| `resources/js/types/index.d.ts` | Adicionar tipos `Account`, `Transaction`, `FinancialGoal`, `WishlistItem` |
