# Vaultus — Restyling completo + dados reais

**Data:** 2026-05-14  
**Escopo:** Migração visual de todas as páginas para o design system OKLCH/editorial, conexão de dados reais no Dashboard, criação de páginas Tarefas e Biblioteca, stubs estilizados para Notas/Contatos/Revisão.

---

## Contexto

O design system foi implementado em `app.css` (tokens OKLCH, fontes Geist/Instrument Serif, classes `.card`, `.btn`, `.kicker`, `.tag`, `.stat`, `.meter`, `.ring`, etc.) mas as páginas internas nunca foram migradas. Elas ainda usam classes Tailwind genéricas (`bg-slate-900`, `text-indigo-600`, `rounded-xl`, `space-y-4`) completamente fora do visual de referência enviado em `Vaultus-handoff.zip`.

Arquivos de referência usados:
- `vaultus-modules-a.jsx` → Tarefas, Projetos, Hábitos, Diário
- `vaultus-modules-b.jsx` → Finanças, Biblioteca, Notas, Contatos, Revisão
- `vaultus-shell.jsx` → Sidebar, Topbar, PageHead, ações por página
- `vaultus-styles.css` → classes de grid ausentes no `app.css` atual

---

## 1. CSS — Adicionar grid helpers

**Arquivo:** `src/resources/css/app.css`

Adicionar ao final (após os utilitários existentes):

```css
.grid { display: grid; gap: 16px; }
.g-4  { grid-template-columns: repeat(4, 1fr); }
.g-3  { grid-template-columns: repeat(3, 1fr); }
.g-2  { grid-template-columns: repeat(2, 1fr); }
.g-12-4 { grid-template-columns: 2fr 1fr; }
.g-12-5 { grid-template-columns: 7fr 5fr; }
```

---

## 2. Button component

**Arquivo:** `src/resources/js/Components/ui/Button.tsx`

Reescrever para emitir classes do design system. Interface idêntica — nenhum consumidor muda.

| Prop variant | Classes CSS emitidas |
|---|---|
| `primary` | `btn btn-primary` |
| `ghost` | `btn btn-ghost` |
| `danger` | `btn btn-ghost` + cor rose via style inline |
| size `sm` | `+ btn-sm` |
| size `md` | (sem modificador) |

---

## 3. Dashboard — dados reais

### 3.1 Backend: DashboardAggregator

**Arquivo:** `src/app/Domains/Dashboard/Services/DashboardAggregator.php`

Adicionar métodos:

**`getTasksToday(User $user): array`**
- Query: `ProjectTask` via `whereHas('project', fn($q) => $q->where('user_id', $user->id))->whereDate('due_at', today())->orderBy('priority')->limit(8)`
- Retorna: `id, title, project_name, priority, due_at, is_done`
- `is_done`: task está em coluna cujo nome contém "Done" ou "Concluíd" (case-insensitive)

**`getActiveProjects(User $user): array`**
- Query: `$user->projects()->where('status', 'active')->with(['tasks.column'])->limit(5)->get()`
- Retorna: `id, title, status, progress_percent, next_task, tasks_done, tasks_total`
- `progress_percent` = `tasks_done / tasks_total * 100` (0 se sem tasks)
- `next_task` = primeiro task não-concluído, ordenado por `position`

**`getFinancialGoals(User $user): array`**
- Query: `$user->financialGoals()->where('is_archived', false)->with('transactionGoals')->get()`
- Retorna: `id, name, category, target_amount, current_amount, progress_percent, deadline, is_completed`
- Usa accessors já existentes: `$goal->current_amount`, `$goal->progress_percent`

**`getWealthChart(User $user): array`**
- Retorna `{ labels: string[], data: float[] }` — 13 meses (mês atual + 12 anteriores)
- Algoritmo: pegar `net_worth` atual → carregar todas as transactions do usuário via accounts → agrupar por `occurred_at` mês/ano → reconstruir série histórica de trás pra frente: `nw[M-1] = nw[M] - delta(M)` onde `delta = income - expense`
- Labels: `['Jun', 'Jul', ..., 'Mai']` (mês abreviado pt-BR)

**`getReading(User $user): array`**
- Query: `LibraryItem::where('user_id', $user->id)->where('type', 'book')->where('status', 'reading')->orderBy('started_at', 'desc')->limit(3)->get()`
- Retorna: `id, title, author, progress_percent, current_page, total_pages, cover_url`

**Atualizar `getStats`:** substituir `tasks_due_today => 0` por count real dos tasks de hoje.

### 3.2 Backend: DashboardController

Adicionar as 5 novas props ao `Inertia::render`:

```php
'tasks_today'      => $this->aggregator->getTasksToday($user),
'projects'         => $this->aggregator->getActiveProjects($user),
'financial_goals'  => $this->aggregator->getFinancialGoals($user),
'wealth_chart'     => $this->aggregator->getWealthChart($user),
'reading'          => $this->aggregator->getReading($user),
```

### 3.3 Novo model: LibraryItem

**Arquivo:** `src/app/Domains/Library/Models/LibraryItem.php`

```php
namespace App\Domains\Library\Models;

class LibraryItem extends Model {
    use SoftDeletes;

    protected $fillable = ['user_id','type','title','status','author',
                           'total_pages','current_page','cover_url',
                           'rating','genre','started_at','finished_at'];

    protected function casts(): array {
        return ['started_at' => 'date', 'finished_at' => 'date'];
    }

    public function getProgressPercentAttribute(): int {
        if (!$this->total_pages) return 0;
        return min(100, (int) round($this->current_page / $this->total_pages * 100));
    }

    public function user() { return $this->belongsTo(User::class); }
}
```

**User model:** adicionar `libraryItems()` relation.

### 3.4 Frontend: Dashboard/Index.tsx

**Saudação:** substituir `"Victor"` hardcoded por `usePage().props.auth.user.name.split(' ')[0]`.

**Novas props TypeScript:**

```ts
interface TaskToday {
  id: number; title: string; project_name: string
  priority: 'high'|'medium'|'low'|null; due_at: string; is_done: boolean
}
interface DashProject {
  id: number; title: string; status: string; progress_percent: number
  next_task: string|null; tasks_done: number; tasks_total: number
}
interface Goal {
  id: number; name: string; category: string
  target_amount: number; current_amount: number
  progress_percent: number; deadline: string; is_completed: boolean
}
interface ReadingItem {
  id: number; title: string; author: string|null
  progress_percent: number; current_page: number; total_pages: number|null
}
interface Props {
  // existentes
  stats: { tasks_due_today: number; habits_done_today: number; habits_total: number;
           journal_entries_this_month: number; open_projects: number; net_worth: number }
  recent_activity: Array<{ event: string; created_at: string }>
  habits_today: Array<{ id: number; name: string; icon: string|null; checked_in_today: boolean }>
  // novos
  tasks_today: TaskToday[]
  projects: DashProject[]
  financial_goals: Goal[]
  wealth_chart: { labels: string[]; data: number[] }
  reading: ReadingItem[]
}
```

**Remoções:** deletar constantes `TODAY_FOCUS`, `DASH_PROJECTS`, `GOALS_DATA`, `READING`, `WEALTH_CHART`, `WEALTH_LABELS`.

**Substituições:**
- Widget Foco de Hoje → usar `tasks_today`; prioridade mapeia para `.tag-rose` (high), `.tag-gold` (medium), `.tag-sky` (low)
- Widget Projetos Ativos → usar `projects`; ring com `progress_percent`, `tasks_done/tasks_total`
- Widget Metas Financeiras (`MetasWidget`) → usar `financial_goals`; ícone derivado de `category` (`Segurança`→Shield, `Patrimônio`→Home, `Experiência`→Plane, default→Star)
- Widget Gráfico → usar `wealth_chart.data` e `wealth_chart.labels`
- Widget Em leitura → usar `reading`; se `total_pages` null, não mostrar barra
- Estados vazios em cada widget quando array vazio

---

## 4. Páginas existentes — restyling

**Regra geral de tradução:**
- `bg-slate-N / border-slate-N / text-slate-N` → tokens CSS (`var(--surface)`, `var(--line)`, `var(--text-2)`)
- `bg-indigo-600 / text-indigo-400` → `var(--green)` / classes `.btn-primary`, `.tag-green`
- `rounded-xl p-5 border border-slate-800` → `className="card"`
- `text-sm font-semibold text-slate-400 uppercase tracking-wider` → `className="kicker"`
- `<Button variant="primary">` → `<button className="btn btn-primary">`
- `<Button variant="ghost">` → `<button className="btn btn-ghost">`
- Status badge custom → `.tag .tag-green/.tag-gold/.tag-rose/.tag-sky`
- Progress bar custom → `.meter > span`
- `max-w-5xl mx-auto px-4 py-6 space-y-8` → remover (layout já gerenciado pelo `.content` do AppLayout)
- `grid grid-cols-N gap-N` → `className="grid g-N"`

**AppLayout — ações por página:** adicionar prop `actions` passando os botões corretos de cada página (ex: Projetos → "Filtros" + "Novo projeto"; Hábitos → segmented control + "Novo hábito"). Ver `pageActions()` em `vaultus-shell.jsx`.

### 4.1 Projetos

**`Projects/Index.tsx`:** reestruturar seguindo `Projetos()` do design:
- Row de 4 stat cards (`.grid.g-4`)
- Grid de project cards (`.grid.g-2`) cada um com `.ring`, `.meter`, status tag, próxima tarefa
- Tabela de Vontades com colunas: Vontade / Área / Prioridade / Adicionada / Ação

**`Projects/components/ProjectCard.tsx`:** substituir card slate por layout do design (ring de progresso + meter + kicker de health).

**`Projects/components/WantCard.tsx`:** substituir por linha de tabela no estilo design (grid-template-columns com `.tag` de prioridade).

**`Projects/Project.tsx`:** aplicar substituições gerais — card do header do projeto, tags de status, botões `.btn`, colunas do kanban com `.card`, task cards com `.check` e `.tag`.

**Outros componentes** (`KanbanBoard`, `KanbanColumn`, `TaskCard`, `TaskForm`, `ProjectForm`, `WantForm`): aplicar substituições gerais de tokens/classes.

### 4.2 Hábitos

**`Habits/Index.tsx`:** reestruturar seguindo `Habitos()` do design:
- Card de Métricas de Hoje (5 colunas com Métrica/Energia/Sono/Água/Peso)
- Tabela de hábitos com colunas: Hábito / Esta semana (7 dots) / Taxa 30d (meter) / Streak / Botão
- Grid `g-12-5`: gráfico de consistência + card de Insights

**Subcomponentes** (`HabitCard`, `StreakDisplay`, `FrequencyBadge`, `HealthMetricsPanel`, `HabitDrawer`): migrar para classes do design system.

### 4.3 Finanças

**`Finance/Index.tsx`:** reestruturar seguindo `Financas()` do design:
- 4 stat cards grandes (`.grid.g-4`)
- Grid `g-12-5`: gráfico de fluxo + donut de alocação
- Grid `g-12-5`: orçamentos por categoria + próximos pagamentos
- `MetasFinanceiras` widget (reusar lógica de `MetasWidget` do Dashboard)
- Tabela de lançamentos recentes

**Subcomponentes** (`AccountCard`, `GoalCard`, `WishlistCard`, `TransactionList`, e forms): migrar tokens.

### 4.4 Diário

**`Journal/Index.tsx`:** reestruturar seguindo `Diario()` do design:
- Layout 2 colunas `gridTemplateColumns: "320px 1fr"`
- Aside: mini calendário mensal + gráfico humor 30d + etiquetas frequentes
- Main: card "Hoje" com prompt + lista de entradas com data serif grande + tags

**Subcomponentes** (`JournalCalendar`, `EntryList`, `EntryEditor`, `PromptsPanel`, `PromptManager`): migrar tokens.

---

## 5. Páginas novas — têm backend

### 5.1 Tarefas

**Arquivo:** `src/resources/js/Pages/Tasks/Index.tsx`  
**Rota existente:** `/tasks` → Stub  
**Rota precisa ser atualizada** no backend para apontar para a nova página.

**Backend — TasksController (criar):**
- `index()`: retorna tasks do usuário agrupadas por Hoje / Esta semana / Concluídas hoje
- Stats: total_hoje, atrasadas, esta_semana, sem_prazo
- Sidebar data: contagem por projeto

**Layout (baseado em `Tarefas()`):**
- 4 stat cards (`.grid.g-4`)
- Grid `1fr 280px`: lista de tasks agrupadas + aside (Inbox + por projeto + dica)
- Cada task: `.check` + título + tag prioridade + projeto + horário + tag categoria

### 5.2 Biblioteca

**Arquivo:** `src/resources/js/Pages/Library/Index.tsx`  
**Model já criado** no passo 3.3.

**Backend — LibraryController (criar):**
- `index()`: books `status=reading`, `status=done` (recentes), `status=queue`
- Stats: total ano, em curso, páginas no ano, ritmo (média 30d)

**Layout (baseado em `Biblioteca()`):**
- 4 stat cards
- Cards de "Em leitura" com capa placeholder + meter + páginas
- Lista "Concluídos recentes" com estrelas de rating
- Lista "Fila" numerada

---

## 6. Stubs estilizados

**Arquivo:** `src/resources/js/Pages/Stub/Index.tsx`

Substituir o card genérico por um placeholder no visual do design system:
- `.page-head` com título e eyebrow corretos
- Card com ícone grande do módulo + mensagem "Em construção" em serif itálico
- Botão ghost "Receber aviso" (inativo)

Módulos afetados: Notas, Contatos, Revisão.

---

## Ordem de implementação

1. **app.css** — grid helpers (1 arquivo, 6 linhas)
2. **Button component** — atualizar classes (1 arquivo)
3. **LibraryItem model** + User relation (2 arquivos)
4. **DashboardAggregator** — 5 novos métodos (1 arquivo)
5. **DashboardController** — novas props (1 arquivo)
6. **Dashboard/Index.tsx** — substituir mocks, novas props (1 arquivo)
7. **Projects** — restyling (Index + Project + ~8 componentes)
8. **Habits** — restyling (Index + ~5 componentes)
9. **Finance** — restyling (Index + ~6 componentes)
10. **Journal** — restyling (Index + ~4 componentes)
11. **Tasks** — nova página + controller
12. **Library** — nova página + controller
13. **Stubs** — atualizar Stub/Index.tsx

---

## Restrições e convenções

- **NÃO usar Tailwind** para cores, backgrounds, borders, spacing de layout
- Grid de múltiplas colunas: usar `.grid.g-N` ou `style={{ display:'grid', gridTemplateColumns:... }}` inline
- Ícones: `<Icons.NomeDoIcone size={N} />` (não `I.NomeDoIcone`)
- Botões: `<button className="btn btn-primary btn-sm">` (não `<Button variant="primary">` nos novos componentes)
- Formulários/modais: preservar toda a lógica existente, apenas migrar visual
- Não alterar rotas, controllers, models de dados existentes (exceto os explicitamente listados)
- Docker: build via `docker compose --profile dev run --rm node sh -c "npm run build"`
