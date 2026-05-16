# Bloco B: Dashboard — Refatoração Completa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o widget "Atividade Recente" pelo widget de diário especificado no handoff, adicionar dados reais de streak/taxa de hábitos, adicionar o rodapé financeiro ao AreaChart, tornar o segmented control do gráfico funcional, tornar card links navegáveis, tornar checkboxes de tarefas interativos, e remover dead code dos widgets antigos.

**Architecture:** Requer mudanças no `DashboardAggregator` (PHP) para expor novos dados, e no `Dashboard/Index.tsx` (React) para usar esses dados e adicionar interatividade. A tab de Dashboard passa a receber `journal_recent` e stats expandidos com `habit_streak`, `habit_rate`, `habit_top`. O segmented control do gráfico filtra os dados já entregues pelo backend em diferentes janelas temporais no frontend.

**Tech Stack:** Laravel 11, Inertia.js, React 18, TypeScript, Docker (comandos via `docker compose`)

**Pré-requisito:** Bloco A concluído (shell corrections).

---

### Task 1: Limpar dead code — pasta `widgets/`

**Files:**
- Delete: `src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx`
- Delete: `src/resources/js/Pages/Dashboard/widgets/RecentActivity.tsx`
- Delete: `src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx`

Esses arquivos não são importados por nenhum componente, usam Tailwind CSS (fora do design system) e contradizem a implementação canônica em `Dashboard/Index.tsx`.

- [ ] **Step 1: Remover os arquivos**

```bash
rm src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx \
   src/resources/js/Pages/Dashboard/widgets/RecentActivity.tsx \
   src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx
rmdir src/resources/js/Pages/Dashboard/widgets
```

- [ ] **Step 2: Verificar que nenhum arquivo importa esses componentes**

```bash
grep -r "widgets/" src/resources/js/
```

Resultado esperado: sem output (nenhuma referência).

- [ ] **Step 3: Build de verificação**

```bash
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -20
```

Resultado esperado: sem erros de import.

---

### Task 2: Backend — Adicionar `journal_recent` ao DashboardAggregator

**Files:**
- Modify: `src/app/Domains/Dashboard/Services/DashboardAggregator.php`
- Modify: `src/app/Domains/Dashboard/Controllers/DashboardController.php`

O widget de diário no Dashboard precisa das últimas 3 entradas com: dia (número), mês (pt-BR abreviado), trecho da entrada (preview) e humor mapeado para label textual.

- [ ] **Step 1: Adicionar método `getJournalRecent` ao DashboardAggregator**

Abrir `src/app/Domains/Dashboard/Services/DashboardAggregator.php` e adicionar após o método `getRecentActivity`:

```php
public function getJournalRecent(User $user): array
{
    $moodLabel = [1 => 'Difícil', 2 => 'Cansado', 3 => 'Neutro', 4 => 'Calmo', 5 => 'Realizado'];
    $ptMonths  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    return $user->journalEntries()
        ->orderBy('date', 'desc')
        ->limit(3)
        ->get()
        ->map(fn($e) => [
            'day'     => $e->date->format('d'),
            'month'   => $ptMonths[$e->date->month - 1],
            'quote'   => $e->preview ?? mb_substr(strip_tags($e->content ?? ''), 0, 120),
            'mood'    => $moodLabel[$e->mood] ?? 'Sereno',
            'tag'     => implode(' · ', array_slice($e->tags ?? [], 0, 2)),
        ])
        ->toArray();
}
```

- [ ] **Step 2: Adicionar `habit_streak`, `habit_rate`, `habit_top` ao `getStats`**

No método `getStats` do DashboardAggregator, após a linha que cria `$doneToday`, adicionar:

```php
        // Streak máximo entre hábitos ativos
        $maxStreak = $activeHabits->max('current_streak') ?? 0;

        // Taxa do mês: check-ins / dias esperados × 100
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $monthCheckIns = $activeHabits->sum(fn($h) => $h->checkIns
            ->filter(fn($ci) => $ci->date->toDateString() >= $startOfMonth)
            ->count()
        );
        $daysElapsed = $now->day;
        $habitRate = $expectedToday->count() > 0
            ? (int) round($monthCheckIns / ($daysElapsed * $expectedToday->count()) * 100)
            : 0;

        // Hábito com mais check-ins no mês
        $topHabit = $activeHabits->sortByDesc(fn($h) => $h->checkIns
            ->filter(fn($ci) => $ci->date->toDateString() >= $startOfMonth)->count()
        )->first();
```

Nota: o modelo `Habit` já carrega `with('checkIns')` através de `$user->habits()->active()->with('checkIns')->get()`. Adicionar ao array de retorno:

```php
            'habit_streak'  => $maxStreak,
            'habit_rate'    => $habitRate,
            'habit_top'     => $topHabit?->name,
```

- [ ] **Step 3: Adicionar receitas/despesas do mês ao `getStats`**

No mesmo `getStats`, antes do `return`, computar:

```php
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $monthEnd   = $now->copy()->endOfMonth()->toDateString();

        $monthlyTransactions = \App\Domains\Finance\Models\Transaction::whereHas(
            'account', fn($q) => $q->where('user_id', $user->id)
        )
        ->whereBetween('occurred_at', [$monthStart, $monthEnd])
        ->whereNull('deleted_at')
        ->get();

        $monthIncome  = (float) $monthlyTransactions->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
        $monthExpense = (float) $monthlyTransactions->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);
```

Adicionar ao array de retorno:
```php
            'month_income'  => $monthIncome,
            'month_expense' => $monthExpense,
```

- [ ] **Step 4: Registrar `journal_recent` no DashboardController**

Abrir `src/app/Domains/Dashboard/Controllers/DashboardController.php` e adicionar a prop:

```php
            'journal_recent'  => $this->aggregator->getJournalRecent($user),
```

Remover também:
```php
            'recent_activity' => $this->aggregator->getRecentActivity($user),
```

(O método `getRecentActivity` pode ser mantido no aggregator mas não é mais necessário no controller.)

- [ ] **Step 5: Verificar resposta do backend**

```bash
docker compose --profile dev run --rm node sh -c "curl -s -k -b 'laravel_session=<seu_cookie>' https://vaultus.local/dashboard" | grep -o '"journal_recent":\[.*\]' | head -c 300
```

Alternativa: abrir as DevTools no browser → Network → `dashboard` → verificar que o payload Inertia inclui `journal_recent`.

---

### Task 3: Frontend — Substituir widget "Atividade Recente" por "Diário · últimas entradas"

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

O widget atual (linhas ~301–328) usa dados de `recent_activity` com eventos de login/logout. Deve ser substituído pelo widget de diário especificado no handoff.

- [ ] **Step 1: Atualizar a interface Props**

No topo de `Dashboard/Index.tsx`, localizar a interface `Props` e:

1. Remover `recent_activity: { event: string; created_at: string }[]`
2. Adicionar:
```tsx
  journal_recent: {
    day: string
    month: string
    quote: string
    mood: string
    tag: string
  }[]
```
3. Adicionar nos stats:
```tsx
  stats: {
    // ... campos existentes ...
    habit_streak: number
    habit_rate: number
    habit_top: string | null
    month_income: number
    month_expense: number
  }
```

- [ ] **Step 2: Substituir o widget no JSX**

Localizar o segundo card do segundo `grid g-12-5` (o que continha "Atividade Recente") e substituir pelo widget de diário:

```tsx
        <div className="card">
          <div className="card-head">
            <div className="card-title">Diário · <b>últimas entradas</b></div>
            <Link href="/journal" className="card-link">
              Abrir diário <Icons.ChevronRight size={11} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {journal_recent.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
                Nenhuma entrada recente.
              </div>
            ) : journal_recent.map((j, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'center', flex: 'none', width: 42, paddingTop: 2 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: 'var(--text)' }}>{j.day}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{j.month}</div>
                </div>
                <div style={{ flex: 1, paddingLeft: 14, borderLeft: '1px solid var(--line-soft)' }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.4 }}>"{j.quote}"</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <span className="tag tag-green"><span className="dot" />{j.mood}</span>
                    {j.tag && <span className="kicker">{j.tag}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
```

Adicionar `Link` ao import do Inertia se não estiver presente:
```tsx
import { Link, router } from '@inertiajs/react'
```

- [ ] **Step 3: Atualizar destructuring no componente**

No início do componente Dashboard, trocar `recent_activity` por `journal_recent` e atualizar stats:

```tsx
export default function DashboardIndex({ stats, journal_recent, habits_today, tasks_today, projects, financial_goals, wealth_chart, reading }: Props) {
```

---

### Task 4: Frontend — Corrigir Mini stats de Hábitos

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

Os 3 Mini cards abaixo do HabitGrid devem mostrar streak, taxa do mês e hábito top — todos agora disponíveis em `stats`.

- [ ] **Step 1: Localizar os Mini stats de hábitos** (~linha 294–297) e substituir:

```tsx
          <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
            <Mini label="Streak Atual" value={`${stats.habit_streak} dias`} delta="recorde pessoal" />
            <Mini label="Taxa do mês" value={`${stats.habit_rate}%`} delta={stats.habit_rate >= 80 ? '+bom ritmo' : 'abaixo da meta'} dir={stats.habit_rate >= 80 ? 'up' : 'flat'} />
            <Mini label="Hábito top" value={stats.habit_top ?? '—'} delta="mais consistente" />
          </div>
```

---

### Task 5: Frontend — Adicionar rodapé financeiro ao AreaChart

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

O card do gráfico de patrimônio deve ter 4 Mini cards abaixo do AreaChart: Receitas/Despesas do mês, Reserva (meses) e Investido. Receitas e Despesas já estão disponíveis em `stats`.

- [ ] **Step 1: Localizar o card do AreaChart** e adicionar o bloco após o `<AreaChart ... />`:

```tsx
          <div style={{ display: 'flex', gap: 32, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line-soft)' }}>
            <Mini
              label={`Receitas (${new Date().toLocaleString('pt-BR', { month: 'short' })})`}
              value={fmtBRL(stats.month_income)}
              delta="este mês"
              dir="up"
            />
            <Mini
              label={`Despesas (${new Date().toLocaleString('pt-BR', { month: 'short' })})`}
              value={fmtBRL(stats.month_expense)}
              delta="este mês"
              dir="flat"
            />
            <Mini
              label="Patrimônio líquido"
              value={fmtBRL(stats.net_worth)}
              delta="acumulado"
              dir="up"
            />
          </div>
```

Adicionar helper `fmtBRL` no topo do arquivo (antes do componente):
```tsx
function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}
```

---

### Task 6: Frontend — Tornar segmented control do gráfico funcional

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

Os botões 3M/6M/12M/Tudo devem filtrar os dados do `wealth_chart` exibindo uma janela temporal diferente. Os dados completos de 13 meses já chegam do backend.

- [ ] **Step 1: Adicionar estado e lógica de filtro**

No início do componente `DashboardIndex`, adicionar:

```tsx
  const [chartPeriod, setChartPeriod] = useState<'3M' | '6M' | '12M' | 'Tudo'>('12M')

  const chartData = (() => {
    const all = wealth_chart.data
    const labels = wealth_chart.labels
    if (chartPeriod === '3M')  return { data: all.slice(-4),  labels: labels.slice(-4)  }
    if (chartPeriod === '6M')  return { data: all.slice(-7),  labels: labels.slice(-7)  }
    if (chartPeriod === 'Tudo') return { data: all,            labels                      }
    return { data: all.slice(-13), labels: labels.slice(-13) } // 12M
  })()
```

- [ ] **Step 2: Substituir o segmented control** no card do gráfico:

```tsx
            <div className="seg">
              {(['3M', '6M', '12M', 'Tudo'] as const).map(p => (
                <button key={p} data-active={chartPeriod === p} onClick={() => setChartPeriod(p)}>{p}</button>
              ))}
            </div>
```

- [ ] **Step 3: Usar `chartData` no AreaChart**:

```tsx
          <AreaChart data={chartData.data} labels={chartData.labels} />
```

---

### Task 7: Frontend — Tornar card links navegáveis

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

Os links "Ver agenda", "Abrir diário", "Ver todos", "Biblioteca" devem navegar para as rotas corretas usando `<Link>` do Inertia.

- [ ] **Step 1: Substituir todos os `<button>` ou `<a>` sem href pelos links corretos**

Procurar por `card-link` no arquivo e substituir cada um:

| Texto | Rota |
|---|---|
| Ver agenda | `/tasks` |
| Ver todos (projetos) | `/projects` |
| Biblioteca | `/library` |

Exemplo do padrão:
```tsx
// ANTES
<a className="card-link">Ver agenda <Icons.ChevronRight size={11} /></a>

// DEPOIS
<Link href="/tasks" className="card-link">Ver agenda <Icons.ChevronRight size={11} /></Link>
```

---

### Task 8: Frontend — Tornar checkboxes de tarefas interativos

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

O `.check` de cada tarefa em "Foco de Hoje" deve alternar `is_done` com otimismo local e persistir via `router.patch`. Como o done é detectado por coluna no backend, usar um endpoint de update simples: `PATCH /projects/tasks/{id}` com o campo `completed_at` (a ser adicionado no Bloco C). Por ora, fazer apenas o toggle de estado local com feedback visual.

- [ ] **Step 1: Adicionar estado local para tarefas**

```tsx
  const [localTasks, setLocalTasks] = useState(tasks_today)

  function toggleTask(id: number) {
    setLocalTasks(prev => prev.map(t =>
      t.id === id ? { ...t, is_done: !t.is_done } : t
    ))
    const task = localTasks.find(t => t.id === id)
    if (!task) return
    router.patch(`/projects/tasks/${id}`, { is_done: !task.is_done }, {
      preserveScroll: true,
      onError: () => setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: task.is_done } : t)),
    })
  }
```

- [ ] **Step 2: Usar `localTasks` no render e adicionar onClick**

```tsx
            {localTasks.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', width: 48, paddingTop: 2 }}>{t.due_at ?? '—'}</div>
                <div
                  className="check"
                  data-checked={t.is_done}
                  onClick={() => toggleTask(t.id)}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ textDecoration: t.is_done ? 'line-through' : 'none', color: t.is_done ? 'var(--text-3)' : 'var(--text)', fontSize: 13.5 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                    <span className="mono">{t.project_name}</span>
                  </div>
                </div>
              </div>
            ))}
```

Nota: o endpoint `PATCH /projects/tasks/{id}` com `is_done` precisará de suporte no backend — será implementado no Bloco C (Task 1). Por enquanto o toggle é visual e o patch retornará erro 422 silenciosamente (o `onError` reverte o estado).

---

### Task 9: Commit

- [ ] **Step 1: Build final e commit**

```bash
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -10
git add src/resources/js/Pages/Dashboard/ \
        src/app/Domains/Dashboard/
git commit -m "feat: refatorar Dashboard — widget diário, stats de hábitos, gráfico interativo, links navegáveis"
```

---

### Checklist de verificação final

- [ ] Pasta `widgets/` removida sem erros de build
- [ ] Widget de diário exibe entradas reais do banco (ou "Nenhuma entrada recente" se vazio)
- [ ] Mini stats de hábitos mostram streak, taxa%, nome do hábito top
- [ ] Rodapé do AreaChart mostra Receitas e Despesas do mês
- [ ] Botões 3M/6M/12M/Tudo filtram o gráfico visualmente
- [ ] "Ver agenda" navega para /tasks
- [ ] "Ver todos" navega para /projects
- [ ] "Biblioteca" navega para /library
- [ ] Checkbox de tarefa alterna visualmente ao clicar
