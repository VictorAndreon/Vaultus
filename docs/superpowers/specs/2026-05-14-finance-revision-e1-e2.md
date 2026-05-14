# Spec — Revisão da Aba de Finanças (Blocos E1 + E2)

**Data:** 2026-05-14
**Escopo:** Correções funcionais, novos modais de CRUD, redesign de GoalCard, dois novos cards (Orçamentos redesenhado + Próximos Pagamentos), e redesign completo de Account.tsx.

---

## Contexto

A aba de Finanças (`Finance/Index.tsx`) foi implementada no Bloco D com layout e dados reais, mas ficou com gaps funcionais relevantes: o botão "+ Lançamento" não tem ação, metas não têm CRUD na tela Index, orçamentos não têm CRUD, e a página Account.tsx está visualmente desalinhada do design system.

---

## Bloco E1 — Modals de CRUD + Correções Funcionais

### 1. Modal de Novo Lançamento

**Trigger:** Botão `+ Lançamento` no `AppLayout actions` do Index.

**Campos do modal:**
- Tipo: seg control `Despesa | Receita`
- Conta: select populado com as contas do usuário
- Valor (R$): input numérico com foco automático
- Categoria: select com `TRANSACTION_CATEGORIES` do `TransactionForm.tsx` existente
- Data: date input (padrão: hoje)
- Descrição: text input
- Método: select (Débito, Crédito, PIX, TED, Dinheiro, Outro)

**Comportamento:** POST para `/finance/transactions` com `preserveScroll: true`. Reutiliza a rota e validação do `TransactionForm.tsx` existente. Após sucesso, fecha modal e recarrega dados.

**Implementação:** Componente `TransactionModal` inline em `Index.tsx`, estado `showTransactionModal` booleano.

---

### 2. CRUD de Metas Financeiras

**GoalCard — redesign visual:**
- Botão `···` (kebab) no canto superior direito → dropdown com `Editar` e `Excluir`
- Botão lápis (ícone SVG) + botão `+ Aportar` lado a lado no rodapé do card
- Valor atual em serif grande (`font-size: 32px`)
- Barra de progresso colorida com a cor da meta + percentual à direita na mesma cor
- Stats grid 3 colunas com sub-notas: "no plano" (verde) ou "↑ ideal R$ X" (dourado)
- Sparkline colorida com a cor da meta
- Cada meta tem sua própria cor independente (`var(--green)`, `var(--gold)`, `var(--sky)`, `var(--purple)`, etc.)

**Modal de Nova/Editar Meta — campos:**
- Nome
- Ícone: grid de 16 emojis selecionáveis (🏠 ✈️ 🚗 🎓 💍 🏖 💼 🏥 📱 🐶 🌱 🛡 ⭐ 🎮 🔧 💰)
- Cor: palette de 6 cores do design system (green, gold, sky, rose, purple, teal)
- Valor alvo (R$)
- Aporte mensal (R$)
- Prazo: date input (mês/ano)
- Nota: text input opcional

**Botão Nova Meta:** Adicionado no header da seção Metas (`+ Nova Meta` ao lado do segmented control de filtro).

**Excluir:** Confirmação via `confirm()` nativo antes do DELETE.

**Rotas necessárias:**
- `POST /finance/goals` — criar
- `PUT /finance/goals/:id` — editar
- `DELETE /finance/goals/:id` — excluir
- `POST /finance/goals/:id/deposit` — já existe

---

### 3. CRUD de Orçamentos — Redesign + Modal

**Redesign visual do card Orçamentos:**
- Header: `ORÇAMENTOS · MÊS` + link `Ajustar` à direita (abre modal)
- Por categoria: dot colorido + nome + percentual + valores `R$ X / R$ Y` alinhados à direita
- Barra de progresso individual com a cor da categoria
- Sem alteração de cor ao ultrapassar 90% (mantém a cor da categoria — a percentagem já comunica o risco)

**Modal "Ajustar Orçamentos" — lista editável:**
- Lista de categorias existentes com campo de limite editável inline
- Botão `×` para excluir categoria
- Formulário no rodapé: nome + limite + cor → `+ Adicionar`
- Salva tudo via `PUT /finance/budgets/batch` (nova rota — upsert em lote das categorias do usuário)

**Backend:** Campo `color` já existe em `budget_categories`. Confirmar que o controller já passa a cor nos dados de `budgets[]`.

---

### 4. Taxa de Poupança — Meta Dinâmica

**Problema atual:** `"meta 40%"` hardcoded no JSX em `Index.tsx:205`.

**Solução:** Adicionar campo `savings_goal_pct` (integer, default 20) na tabela `users` ou em uma tabela `user_settings`. Controller passa o valor para o frontend. O BigStat card exibe `meta {savings_goal_pct}%` dinamicamente.

**Escopo mínimo:** Campo na tabela `users`, sem tela de configuração — o valor padrão de 20% já é suficiente para eliminar o hardcode.

---

### 5. Card "Próximos Pagamentos" — Feature Nova

**Nova tabela `upcoming_payments`:**
```
id, user_id, description, amount (encrypted), due_date (date),
tag (nullable: 'meta'|null), linked_goal_id (nullable FK → financial_goals),
created_at, updated_at
```

**Lógica de exibição:**
- Controller busca pagamentos com `due_date >= hoje` e `due_date <= hoje + 30 dias`, ordenados por `due_date ASC`
- Badge `Xd`: calculado dinamicamente — dias até o vencimento. Exibido em vermelho (`tag-rose`) se `≤ 3 dias`
- Badge `meta`: exibido quando `tag = 'meta'` ou `linked_goal_id` preenchido, em verde (`tag-green`)

**CRUD:** Modal simples com campos: descrição, valor, data de vencimento, vincular à meta (select opcional). Botão `+ Adicionar` no card-head.

**Rotas necessárias:**
- `POST /finance/upcoming-payments`
- `PUT /finance/upcoming-payments/:id`
- `DELETE /finance/upcoming-payments/:id`

---

## Bloco E2 — Redesign de Account.tsx

### Estrutura da página

**AppLayout props atualizadas:**
- `eyebrow`: tipo da conta (ex: "Conta Corrente")
- `subtitle`: "Histórico e lançamentos desta conta"
- `actions`: botão `+ Nova Transação` (abre modal)

**4 Stat cards (grid `2fr 1fr 1fr 1fr`):**
1. **Saldo atual** (2fr): valor em serif grande + mini meter mostrando % do pico histórico + sub-label "X% do pico histórico"
2. **Receitas · Mês**: total de receitas do mês corrente em verde
3. **Despesas · Mês**: total de despesas do mês corrente em rose
4. **Transações**: contagem de transações do mês corrente

**Tabela de transações — redesign:**
- Colunas: Data | Descrição | Categoria | Método | Valor | Ações
- Grid: `80px 1fr 120px 150px 110px 80px`
- Linha de cabeçalho em mono uppercase text-4
- Ações inline: `Editar` (ghost) + `×` (rose) por linha
- Filtros mantidos: seg control tipo + select categoria

**TransactionForm — modal ao invés de inline:**
- Tanto "+ Nova Transação" quanto "Editar" abrem o form em modal (overlay com backdrop blur)
- Remove o comportamento de expandir inline que empurrava o conteúdo

**Dados adicionais necessários no controller (`FinanceController::account`):**
- `month_income`: soma de receitas do mês corrente para esta conta
- `month_expense`: soma de despesas do mês corrente para esta conta
- `month_count`: contagem de transações do mês corrente
- `peak_balance`: maior saldo dos últimos 12 meses — calculado no controller como `max` do saldo diário reconstruído via transações (`SELECT MAX(running_balance) FROM ...`). Se custoso, usar `current_balance * 1.2` como aproximação razoável

---

## Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `Finance/Index.tsx` | TransactionModal, GoalCard redesign, GoalModal, BudgetModal, card Próximos Pagamentos |
| `Finance/Account.tsx` | Redesign completo: AppLayout props, 4 stat cards, tabela de transações, TransactionForm em modal |
| `Finance/components/TransactionList.tsx` | Redesign visual para tabela com colunas |
| `Finance/components/GoalCard.tsx` | Substituído pelo GoalCard rico do Index (mesclar em arquivo único) |
| `Finance/components/TransactionForm.tsx` | Wrapping em modal (ou novo `TransactionModal.tsx`) |
| `FinanceController.php` | Novos dados: upcoming_payments, savings_goal_pct, dados de conta do mês |
| `Migrations` | `upcoming_payments` table, `savings_goal_pct` em users |
| `Models/UpcomingPayment.php` | Novo model com amount encrypted |

---

## O que NÃO entra neste escopo

- Notificações push para pagamentos futuros
- Relatórios ou exportação de dados
- Recorrência automática de pagamentos futuros
- Integração com Open Finance / APIs bancárias
- Tela separada de configurações de usuário

---

## Ordem de implementação sugerida

1. Migração `upcoming_payments` + campo `savings_goal_pct`
2. Controller: novos dados (upcoming_payments, savings_goal_pct, dados de conta do mês)
3. GoalCard redesign + GoalModal (CRUD de metas)
4. TransactionModal (corrige botão quebrado)
5. BudgetModal (CRUD de orçamentos) + redesign do card
6. Card Próximos Pagamentos
7. Account.tsx redesign completo
