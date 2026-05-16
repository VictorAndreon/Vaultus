# Revisão da Aba Finanças — Índice dos Planos

> Gerado a partir do Code Review minucioso de 2026-05-15. Quatro planos independentes cobrem os 10 itens do backlog priorizado.

## Visão Geral

| Plano | Foco | Itens do backlog | Crítico? | Esforço |
|-------|------|------------------|---------|---------|
| [Plano A](2026-05-15-plano-a-aporte-meta-transferencia-interna.md) | Aporte de Meta como Transferência Interna | #1 | **SIM** | Médio (~3-4 dias) |
| [Plano B](2026-05-15-plano-b-lancamentos-paginacao-filtros.md) | Página de Lançamentos com Paginação e Filtros | #2, #7 | Não | Médio (~3 dias) |
| [Plano C](2026-05-15-plano-c-hardening-financeiro.md) | Hardening Financeiro (centavos, idempotência, audit, validações) | #3, #4, #8, #9 | Não | Alto (~5-7 dias) |
| [Plano D](2026-05-15-plano-d-refatoracao-arquitetural.md) | Refatoração (Aggregator backend + decomposição React) | #5, #6, #10* | Não | Baixo (~2 dias) |

> \*Item #10 (validação cruzada credit/loan) foi absorvido no Plano C (Task 22) por proximidade temática com hardening.

## Dependências e Sequência Recomendada

```
                    ┌──────────────────┐
                    │  Plano D (refator) │  ← Pode rodar QUALQUER hora,
                    │  baixo risco       │    sem mudar comportamento.
                    └────────┬─────────┘
                             │ (opcional, melhora produtividade)
                             ▼
   ┌─────────────────────────────────────────────┐
   │              Plano A (crítico)               │ ← Resolve o bug visível
   │  Aporte de meta como transferência interna   │   ao usuário.
   └────────────────┬─────────────────────────────┘
                    │
                    ▼
              ┌──────────────────┐         ┌──────────────────┐
              │   Plano B          │         │   Plano C          │
              │   Página listagem  │         │   Hardening        │
              └──────────────────┘         └──────────────────┘
              (independentes — paralelizam)
```

**Justificativa da ordem:**

1. **Plano D primeiro (opcional):** Extrair `FinanceDashboardAggregator` e quebrar `Index.tsx` torna os Planos A e B **mais fáceis** porque o código fica menor e mais focado. Mas se houver pressão de cronograma, pode ser feito depois.

2. **Plano A é o crítico:** Resolve a inconsistência contábil que o usuário **vê na tela** (aporte aparece como despesa). Os demais planos não corrigem este bug.

3. **Planos B e C são paralelos:** Nem B precisa de C nem vice-versa. B mexe em frontend + uma rota nova. C mexe em casts/middleware/observers.

4. **Plano C (Checkpoint 1) impacta TODOS:** A migração de float para centavos beneficia A/B/D. Se C for executado antes, os planos seguintes já usam centavos nativamente. Se for depois, há uma "fase mista" onde alguns testes precisam ajuste.

## Decisão Arquitetural Travada

**Subconta virtual para metas** (escolhida no plano A): cada `FinancialGoal` ganha uma `Account` com `type='goal'`, `is_internal=true`. Aporte vira transferência interna. Mantém a invariante `Patrimônio = Σ Accounts` e reusa a infraestrutura de `transfer_pair_id`.

Razões para essa escolha (vs. alternativa de criar transação `expense` ghost):

| Critério | Subconta virtual | Despesa ghost |
|----------|------------------|---------------|
| Invariante contábil | Preserva `Σ contas = patrimônio` | Quebra (precisa somar `Σ contas + Σ goals.current`) |
| Reutilização de código | Reusa `createTransferPair` (já testado) | Cria categoria fantasma `_goal_deposit_` |
| UX de listagem | Aparece como transferência (`↔`) com cor neutra | Aparece como despesa (`−`) com cor vermelha — confunde |
| Reversão de aporte | Excluir transferência (par some automático) | Excluir transação E desfazer TransactionGoal |
| Cross-cutting (relatórios, exportação) | Tudo gira em torno de `Account` e `Transaction` (modelo único) | Lógica extra em cada relatório para deduplicar metas |

## Recomendação Pragmática

Se o time tem **uma semana** para entregar valor visível:

1. **Plano A inteiro** (corrige o bug que dói).
2. **Plano B inteiro** (entrega a feature pedida da tabela completa).

Se houver **duas semanas**:

3. Adicionar **Plano D** (refator), porque o `Index.tsx` de 1037 linhas vai virar barreira em cada novo PR de finanças.

Se houver **mais tempo / objetivo de "fintech-grade"**:

4. Executar **Plano C** integralmente (centavos + idempotência + audit log). Esse é o trabalho que **distingue um app financeiro amador de um sério**.

## Como Executar

Cada plano tem o cabeçalho padrão do skill superpowers e pode ser executado via:

- **Subagent-Driven (recomendado):** `superpowers:subagent-driven-development` — um agente fresco por task, com review entre tasks.
- **Inline:** `superpowers:executing-plans` — batch execution com checkpoints.

Os 4 planos somam **~80 tasks**. Não tente executar tudo numa sessão — quebre por Checkpoint (cada Checkpoint é um commit).

## Métricas de Sucesso (após todos os 4 planos)

- [ ] Aporte em meta NÃO altera Patrimônio Líquido (smoke test manual).
- [ ] `/finance/transactions?date_from=2024-01-01&search=netflix` filtra corretamente.
- [ ] `php artisan test --filter=Finance` passa com 100% verde.
- [ ] `Idempotency-Key` em escritas previne duplicação por clique-duplo.
- [ ] `audit_logs` é populada em toda mutation financeira.
- [ ] Valores monetários armazenados como **centavos inteiros** (verificável com `tinker`).
- [ ] `FinanceController::index` tem menos de 15 linhas.
- [ ] `Pages/Finance/Index.tsx` tem menos de 300 linhas.
- [ ] Nenhuma transação de transferência pode ser editada via PATCH direto.

---

## Apêndice: Mapeamento Reverso (item → plano → tasks)

| Item do backlog | Plano | Tasks aproximadas |
|---|---|---|
| #1 Aporte como transferência | A | 1-24 |
| #2 Página de lançamentos | B | 9-16 |
| #3 Centavos | C | 1-8 |
| #4 Idempotência | C | 9-14 |
| #5 Extrair FinanceDashboardAggregator | D | 1-4 |
| #6 Quebrar Index.tsx | D | 5-16 |
| #7 Índices SQL | B | 7 |
| #8 AuditLog | C | 15-19 |
| #9 Bloquear edição de transferência | C | 20-23 |
| #10 Validação cruzada credit/loan | C | 22 |
