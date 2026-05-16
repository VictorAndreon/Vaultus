# Bloco C: Tarefas, Hábitos e Diário — Correções Comportamentais e Visuais

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o comportamento interativo das 3 telas (checkboxes sem toggle, hábito com cor genérica, modo edição do diário que oculta o aside) e adicionar as seções de visualização ausentes (gráfico de consistência, card de humor no diário, título nas entradas).

**Architecture:** Requer 3 migrações pequenas — `tag` e `completed_at` em `project_tasks`, `color` em `habits`, `title` em `journal_entries`. Controllers e aggregators são atualizados para expor os novos campos. No frontend, os componentes recebem novos dados e interatividade sem mudar a estrutura de layout.

**Tech Stack:** Laravel 11, PostgreSQL, Inertia.js, React 18, TypeScript, Docker

**Pré-requisito:** Bloco A concluído.

---

## PARTE 1: TAREFAS

### Task 1: Migração — `tag` e `completed_at` em `project_tasks`

**Files:**
- Create: `src/database/migrations/2026_05_14_000001_add_tag_and_completed_at_to_project_tasks.php`
- Modify: `src/app/Domains/Projects/Models/ProjectTask.php`

- [ ] **Step 1: Criar a migração**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan make:migration add_tag_and_completed_at_to_project_tasks"
```

Editar o arquivo criado:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->string('tag', 50)->nullable()->after('priority');
            $table->timestamp('completed_at')->nullable()->after('due_at');
        });
    }

    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropColumn(['tag', 'completed_at']);
        });
    }
};
```

- [ ] **Step 2: Rodar a migração**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan migrate"
```

Resultado esperado: `Migrating: 2026_05_14_000001_add_tag_and_completed_at_to_project_tasks` → `Migrated`.

- [ ] **Step 3: Adicionar `tag`, `completed_at` ao fillable do model ProjectTask**

Abrir `src/app/Domains/Projects/Models/ProjectTask.php` e adicionar ao `$fillable`:

```php
    protected $fillable = [
        'project_id', 'project_column_id', 'title', 'description',
        'priority', 'tag', 'position', 'total_seconds', 'due_at', 'completed_at',
    ];
```

Adicionar no `casts()`:
```php
        'completed_at' => 'datetime',
```

---

### Task 2: Backend — Suporte ao toggle `is_done` via `completed_at`

**Files:**
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php`
- Modify: `src/routes/web.php`
- Modify: `src/app/Domains/Tasks/Controllers/TasksController.php`
- Modify: `src/app/Domains/Dashboard/Services/DashboardAggregator.php`

- [ ] **Step 1: Adicionar rota de toggle**

Em `src/routes/web.php`, após a linha `Route::patch('/projects/tasks/{task}', ...)`:

```php
    Route::patch('/projects/tasks/{task}/toggle-done', [ProjectTaskController::class, 'toggleDone']);
```

- [ ] **Step 2: Adicionar método `toggleDone` no ProjectTaskController**

```php
    public function toggleDone(Request $request, ProjectTask $task): \Illuminate\Http\Response
    {
        $this->authorize('update', $task->project);

        $task->update([
            'completed_at' => $task->completed_at ? null : now(),
        ]);

        return response()->noContent();
    }
```

- [ ] **Step 3: Atualizar `isDone` no TasksController para checar `completed_at` também**

No `TasksController@index`, a closure `$isDone` já checa pelo nome da coluna. Atualizar para incluir `completed_at`:

```php
        $isDone = fn($t) => $t->completed_at !== null || ($t->column && (
            str_contains(strtolower($t->column->name), 'done') ||
            str_contains(strtolower($t->column->name), 'conclu')
        ));
```

- [ ] **Step 4: Atualizar `getTasksToday` no DashboardAggregator** para usar a mesma lógica:

```php
    ->map(fn($t) => [
        'id'           => $t->id,
        'title'        => $t->title,
        'project_name' => $t->project->title,
        'priority'     => $t->priority,
        'due_at'       => $t->due_at?->format('H:i'),
        'is_done'      => $t->completed_at !== null || $this->isDoneColumn($t->column?->name),
    ])
```

---

### Task 3: Frontend — Tarefas: checkbox com toggle real + tag + inbox listada

**Files:**
- Modify: `src/resources/js/Pages/Tasks/Index.tsx`
- Modify: `src/resources/js/types/index.d.ts`

- [ ] **Step 1: Adicionar `tag` e `completed_at` ao tipo `ProjectTask` em `types/index.d.ts`**

```ts
export interface ProjectTask {
    id: number
    project_column_id: number
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high' | 'urgent'
    tag: string | null
    position: number
    due_at: string | null
    completed_at: string | null
}
```

- [ ] **Step 2: Atualizar o tipo das tasks na interface Props de Tasks/Index.tsx**

Adicionar `tag: string | null` ao tipo inline das tasks no Props:

```tsx
interface Task {
  id: number
  title: string
  project_name: string
  priority: string
  tag: string | null
  due_at: string | null
  due_date: string | null
  is_done: boolean
  group: 'today' | 'week' | 'later' | 'done_today'
}
```

- [ ] **Step 3: Adicionar estado local e toggle**

No componente, adicionar estado e função:

```tsx
  const [localTasks, setLocalTasks] = useState(tasks)

  function toggleTask(id: number) {
    const task = localTasks.find(t => t.id === id)
    if (!task) return
    setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: !t.is_done } : t))
    router.patch(`/projects/tasks/${id}/toggle-done`, {}, {
      preserveScroll: true,
      onError: () => setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: task.is_done } : t)),
    })
  }
```

- [ ] **Step 4: Adicionar onClick ao `.check` e renderizar `tag`**

No render de cada task row, atualizar:

```tsx
                    <div
                      className="check"
                      data-checked={t.is_done}
                      onClick={() => toggleTask(t.id)}
                      style={{ cursor: 'pointer' }}
                    />
```

Abaixo do projeto e due_at, adicionar tag:

```tsx
                        {t.tag && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.Tag size={11} /> {t.tag}
                          </span>
                        )}
```

- [ ] **Step 5: Atualizar o aside "Inbox" para listar tarefas sem prazo**

A prop `by_project` já existe. Adicionar uma prop `no_due_tasks` no TasksController:

No `TasksController@index`, adicionar ao array de retorno:

```php
            'no_due_tasks' => $noDue->take(5)->map(fn($t) => [
                'id'    => $t->id,
                'title' => $t->title,
            ])->values()->toArray(),
```

No `Tasks/Index.tsx`, adicionar ao Props e ao aside:

```tsx
  no_due_tasks: { id: number; title: string }[]
```

```tsx
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {no_due_tasks.length === 0
                ? <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Inbox vazia.</div>
                : no_due_tasks.map((x, i) => (
                  <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)' }}>
                    <Icons.Inbox size={13} /> {x.title}
                  </div>
                ))
              }
            </div>
```

- [ ] **Step 6: Também atualizar o Dashboard para usar a nova rota `/projects/tasks/{id}/toggle-done`**

No `Dashboard/Index.tsx` (Bloco B Task 8), trocar `router.patch('/projects/tasks/${id}', { is_done: ... })` por:

```tsx
    router.patch(`/projects/tasks/${id}/toggle-done`, {}, { preserveScroll: true, ... })
```

---

### Task 4: Commit — Tarefas

- [ ] **Step 1: Commit**

```bash
git add src/database/migrations/ \
        src/app/Domains/Projects/ \
        src/app/Domains/Tasks/ \
        src/app/Domains/Dashboard/ \
        src/resources/js/Pages/Tasks/ \
        src/resources/js/Pages/Dashboard/ \
        src/routes/web.php \
        src/resources/js/types/
git commit -m "feat: tarefas — toggle is_done, campo tag, inbox com lista real"
```

---

## PARTE 2: HÁBITOS

### Task 5: Migração — `color` em `habits`

**Files:**
- Create: `src/database/migrations/2026_05_14_000002_add_color_to_habits.php`
- Modify: `src/app/Domains/Habits/Models/Habit.php`

- [ ] **Step 1: Criar migração**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan make:migration add_color_to_habits"
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('habits', function (Blueprint $table) {
            $table->string('color', 60)->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('habits', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
```

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan migrate"
```

- [ ] **Step 2: Adicionar `color` ao fillable do Habit model**

```php
    protected $fillable = [
        'user_id', 'name', 'icon', 'color', 'frequency_type',
        'frequency_days', 'frequency_times', 'category', 'is_active',
    ];
```

- [ ] **Step 3: Adicionar `color` ao tipo `Habit` em `types/index.d.ts`**

```ts
export interface Habit {
    // ...campos existentes...
    color: string | null
}
```

---

### Task 6: Frontend — Hábitos: cor por hábito, week dots corretos, sem botão extra, labels de humor

**Files:**
- Modify: `src/resources/js/Pages/Habits/components/HabitCard.tsx`
- Modify: `src/resources/js/Pages/Habits/components/HabitDrawer.tsx`
- Modify: `src/resources/js/Pages/Habits/components/HealthMetricsPanel.tsx`
- Modify: `src/resources/js/Pages/Habits/Index.tsx`
- Modify: `src/app/Domains/Habits/Controllers/HabitController.php`

- [ ] **Step 1: HabitCard — usar `h.color` em vez de estado**

No `HabitCard.tsx`, substituir:
```tsx
const color = checkedIn ? 'var(--green)' : 'var(--gold)'
```
por:
```tsx
const color = habit.color ?? 'var(--green)'
```

Remover o botão de editar extra — manter apenas o botão "Hoje":

Localizar e remover (em HabitCard.tsx):
```tsx
                <button className="btn btn-ghost btn-sm" ...>
                  <Icons.Edit size={12} />
                </button>
```

Manter apenas:
```tsx
                <button className="btn btn-soft btn-sm" onClick={onCheckIn} disabled={isLoading}>
                  <Icons.Check size={12} /> Hoje
                </button>
```

- [ ] **Step 2: HabitCard — corrigir week dots para exibir Seg–Dom da semana atual**

Substituir a lógica `last7` por semana atual (segunda a domingo):

```tsx
  const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  // Calcula datas de segunda (0) a domingo (6) da semana atual
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=dom, 1=seg...
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
```

No render dos dots, usar `weekDates`:

```tsx
          {weekDates.map((dateStr, i) => {
            const filled = habit.recent_check_ins.includes(dateStr)
            const isToday = dateStr === today.toISOString().slice(0, 10)
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: filled ? color : 'transparent',
                  border: filled ? 'none' : `1.5px ${isToday ? 'solid' : 'dashed'} ${isToday ? color : 'var(--line-2)'}`,
                }} />
                <span style={{ fontSize: 9.5, color: isToday ? color : 'var(--text-4)', fontFamily: 'var(--mono)' }}>
                  {WEEK_LABELS[i]}
                </span>
              </div>
            )
          })}
```

- [ ] **Step 3: HealthMetricsPanel — mapear número → rótulo para Humor e Energia**

No `HealthMetricsPanel.tsx`, adicionar os mapeamentos:

```tsx
const MOOD_LABELS: Record<number, string> = { 1: 'Difícil', 2: 'Cansado', 3: 'Neutro', 4: 'Calmo', 5: 'Realizado' }
const ENERGY_LABELS: Record<number, string> = { 1: 'Esgotado', 2: 'Baixo', 3: 'Médio', 4: 'Alta', 5: 'Ótimo' }
```

Substituir onde exibe `mood` e `energy`:

```tsx
// ANTES
value={todayMetrics?.mood != null ? String(todayMetrics.mood) : '—'}

// DEPOIS
value={todayMetrics?.mood != null ? (MOOD_LABELS[todayMetrics.mood] ?? String(todayMetrics.mood)) : '—'}
```

```tsx
// ANTES
value={todayMetrics?.energy != null ? String(todayMetrics.energy) : '—'}

// DEPOIS
value={todayMetrics?.energy != null ? (ENERGY_LABELS[todayMetrics.energy] ?? String(todayMetrics.energy)) : '—'}
```

- [ ] **Step 4: HabitDrawer — adicionar seletor de cor**

No formulário do `HabitDrawer.tsx`, adicionar campo de cor após o campo de categoria:

```tsx
const COLOR_OPTIONS = [
  { label: 'Verde',   value: 'var(--green)' },
  { label: 'Dourado', value: 'var(--gold)'  },
  { label: 'Céu',     value: 'var(--sky)'   },
  { label: 'Rosa',    value: 'var(--rose)'  },
]

// No JSX do formulário:
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Cor</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, color: c.value }))}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c.value,
                  border: form.color === c.value ? '2px solid var(--text)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>
```

Garantir que `color` está no `form` state inicial e na chamada `router.post/patch`.

- [ ] **Step 5: HabitController — expor `color` na resposta**

Verificar que o `HabitController@index` inclui `color` nos dados retornados ao frontend. Se usa Resource, adicionar `'color' => $habit->color` ao mapeamento.

---

### Task 7: Frontend — Hábitos: seção "Consistência · 12 semanas" + Insights

**Files:**
- Modify: `src/resources/js/Pages/Habits/Index.tsx`
- Modify: `src/app/Domains/Habits/Controllers/HabitController.php`

O design especifica um AreaChart de consistência de 12 semanas e um card de Insights abaixo da tabela de hábitos. Esses dados precisam ser computados no backend.

- [ ] **Step 1: Adicionar dado de consistência semanal ao HabitController**

No `HabitController@index`, adicionar ao Inertia render:

```php
        $user     = $request->user();
        $now      = Carbon::now($user->timezone);

        // 12 semanas de consistência (% de hábitos esperados concluídos por semana)
        $weeklyRate = [];
        $weekLabels = [];
        $activeHabits = $user->habits()->active()->with(['checkIns'])->get();

        for ($w = 11; $w >= 0; $w--) {
            $weekStart = $now->copy()->startOfWeek()->subWeeks($w);
            $weekEnd   = $weekStart->copy()->endOfWeek();
            $label     = 'S' . (12 - $w);

            $totalExpected = 0;
            $totalDone     = 0;

            foreach ($activeHabits as $habit) {
                for ($d = 0; $d < 7; $d++) {
                    $day = $weekStart->copy()->addDays($d);
                    if ($day->isAfter($now)) continue;
                    if ($habit->isExpectedOn($day, $user->timezone)) {
                        $totalExpected++;
                        $dateStr = $day->toDateString();
                        if ($habit->checkIns->contains(fn($ci) => $ci->date->toDateString() === $dateStr)) {
                            $totalDone++;
                        }
                    }
                }
            }

            $weeklyRate[] = $totalExpected > 0 ? (int) round($totalDone / $totalExpected * 100) : 0;
            $weekLabels[] = $label;
        }

        // Insights simples
        $avgRate     = count($weeklyRate) ? (int) round(array_sum($weeklyRate) / count($weeklyRate)) : 0;
        $bestStreak  = $activeHabits->max('best_streak') ?? 0;
        $currentStreak = $activeHabits->max('current_streak') ?? 0;
```

Adicionar ao array retornado:

```php
            'consistency' => [
                'labels' => $weekLabels,
                'data'   => $weeklyRate,
            ],
            'insights' => [
                'avg_rate'       => $avgRate,
                'best_streak'    => $bestStreak,
                'current_streak' => $currentStreak,
            ],
```

- [ ] **Step 2: Adicionar o AreaChart de consistência ao Habits/Index.tsx**

Abrir `src/resources/js/Pages/Habits/Index.tsx`. Adicionar `consistency` e `insights` à interface Props:

```tsx
  consistency: { labels: string[]; data: number[] }
  insights: { avg_rate: number; best_streak: number; current_streak: number }
```

Reutilizar o componente `AreaChart` que já existe em `Dashboard/Index.tsx`. Como não está exportado, copiar a definição diretamente no arquivo `Habits/Index.tsx`:

```tsx
function AreaChart({ data, h = 120, accent = 'var(--green)', labels }: {
  data: number[]; h?: number; accent?: string; labels: string[]
}) {
  const w = 600
  const min = Math.min(...data) * 0.9
  const max = Math.max(...data) * 1.1
  const range = max - min || 1
  const pad = 24
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - 24 - ((v - min) / range) * (h - 48)
    return [x, y] as [number, number]
  })
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  const areaPath = linePath + ` L${pts[pts.length - 1][0]},${h - 24} L${pts[0][0]},${h - 24} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="hab-area-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={pad} x2={w - pad} y1={24 + i * ((h - 48) / 3)} y2={24 + i * ((h - 48) / 3)} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
      ))}
      <path d={areaPath} fill="url(#hab-area-grad)" />
      <path d={linePath} fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {labels.map((l, i) => {
        const x = pad + (i / (labels.length - 1)) * (w - pad * 2)
        return <text key={i} x={x} y={h - 6} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
      })}
    </svg>
  )
}
```

Adicionar após a tabela de hábitos:

```tsx
      <div className="grid g-12-5">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Consistência · <b>12 semanas</b></div>
          </div>
          <AreaChart data={consistency.data} labels={consistency.labels} h={120} />
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Insights</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="kicker">Taxa média das últimas 12 semanas</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)', marginTop: 4 }}>{insights.avg_rate}%</div>
            </div>
            <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', gap: 24 }}>
              <div>
                <div className="kicker">Streak atual</div>
                <div className="mono" style={{ fontSize: 20, color: 'var(--text)', marginTop: 4 }}>{insights.current_streak} dias</div>
              </div>
              <div>
                <div className="kicker">Melhor streak</div>
                <div className="mono" style={{ fontSize: 20, color: 'var(--text)', marginTop: 4 }}>{insights.best_streak} dias</div>
              </div>
            </div>
          </div>
        </div>
      </div>
```

---

### Task 8: Commit — Hábitos

- [ ] **Step 1: Commit**

```bash
git add src/database/migrations/ \
        src/app/Domains/Habits/ \
        src/resources/js/Pages/Habits/ \
        src/resources/js/types/
git commit -m "feat: hábitos — cor por hábito, week dots Seg-Dom, labels humor, gráfico de consistência"
```

---

## PARTE 3: DIÁRIO

### Task 9: Migração — `title` em `journal_entries`

**Files:**
- Create: `src/database/migrations/2026_05_14_000003_add_title_to_journal_entries.php`
- Modify: `src/app/Domains/Journal/Models/JournalEntry.php`

- [ ] **Step 1: Criar migração**

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan make:migration add_title_to_journal_entries"
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->string('title', 200)->nullable()->after('date');
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropColumn('title');
        });
    }
};
```

```bash
docker compose --profile dev run --rm node sh -c "cd /var/www/html && php artisan migrate"
```

- [ ] **Step 2: Adicionar `title` ao fillable do JournalEntry model e ao tipo TS**

No `JournalEntry.php`, adicionar `'title'` ao `$fillable`.

Em `types/index.d.ts`:
```ts
export interface JournalEntry {
    id: number
    date: string
    title: string | null
    content: string
    tags: string[]
    health_metric_id: number | null
    mood: number | null
    energy: number | null
    preview: string | null
}
```

---

### Task 10: Frontend — Diário: título na EntryList + card de humor no aside + layout unificado

**Files:**
- Modify: `src/resources/js/Pages/Journal/components/EntryList.tsx`
- Modify: `src/resources/js/Pages/Journal/components/EntryEditor.tsx`
- Modify: `src/resources/js/Pages/Journal/Index.tsx`
- Modify: `src/app/Domains/Journal/Controllers/JournalEntryController.php`

- [ ] **Step 1: EntryList — exibir título acima do preview**

Localizar onde o preview/conteúdo é renderizado e adicionar o título acima:

```tsx
              {entry.title && (
                <h3 className="h-2" style={{ marginBottom: 6, fontSize: 18 }}>{entry.title}</h3>
              )}
              {entry.preview && (
                <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.5 }}>{entry.preview}</p>
              )}
```

- [ ] **Step 2: EntryEditor — adicionar campo de título**

No formulário do editor, adicionar um input de título acima da área de texto Tiptap:

```tsx
          <input
            type="text"
            placeholder="Título da entrada (opcional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)',
              marginBottom: 12, paddingBottom: 12,
              borderBottom: '1px solid var(--line-soft)',
            }}
          />
```

Adicionar `title` ao estado do editor e incluir no `router.post/patch` payload:

```tsx
  const [title, setTitle] = useState(entry?.title ?? '')

  // no autosave / submit:
  router.patch(`/journal/${entry.id}`, { title, content: editor.getHTML(), tags, mood, energy }, ...)
```

- [ ] **Step 3: JournalEntryController — incluir `title` no store/update**

No `JournalEntryController@store` e `@update`, adicionar `title` à validação e ao update:

```php
        $data = $request->validate([
            'date'     => 'sometimes|date',
            'title'    => 'nullable|string|max:200',
            'content'  => 'nullable|string',
            'tags'     => 'nullable|array',
            'mood'     => 'nullable|integer|min:1|max:5',
            'energy'   => 'nullable|integer|min:1|max:5',
        ]);
```

- [ ] **Step 4: Journal/Index.tsx — adicionar card "Humor · 30 dias" ao aside e manter aside visível no modo edição**

Adicionar ao JournalEntryController a prop `mood_chart` (30 dias de humor):

```php
        $moodChart = $user->journalEntries()
            ->whereNotNull('mood')
            ->where('date', '>=', now()->subDays(30)->toDateString())
            ->orderBy('date')
            ->get(['date', 'mood'])
            ->map(fn($e) => ['label' => $e->date->format('d/M'), 'value' => $e->mood])
            ->toArray();
```

Adicionar ao Inertia render: `'mood_chart' => $moodChart`.

No `Journal/Index.tsx`, o layout atual substitui o aside por `PromptsPanel` ao entrar no modo edição. Corrigir para manter o aside original visível e adicionar o card de humor:

```tsx
      {/* Aside — sempre visível */}
      <aside style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <JournalCalendar ... />

        {mood_chart.length > 0 && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Humor · <b>30 dias</b></div>
            </div>
            <MoodChart data={mood_chart} />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
              <div>
                <div className="kicker">Média</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginTop: 2 }}>
                  {MOOD_LABELS[Math.round(mood_chart.reduce((s, m) => s + m.value, 0) / mood_chart.length)] ?? '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          {/* Etiquetas frequentes — mantido existente */}
        </div>
      </aside>

      {/* Section principal */}
      <section style={{ flex: 1, minWidth: 0 }}>
        {selectedDate
          ? <EntryEditor ... />
          : <EntryList ... />
        }
        {/* PromptsPanel pode ir dentro da section, abaixo do editor, não no aside */}
      </section>
```

Adicionar componente `MoodChart` (mini sparkline de humor):

```tsx
function MoodChart({ data }: { data: { label: string; value: number }[] }) {
  const values = data.map(d => d.value)
  const labels = data.map(d => d.label)
  const min = 1, max = 5, range = 4
  const w = 400, h = 60, pad = 8
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / range) * (h - pad * 2),
  ] as [number, number])
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <path d={linePath} fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const MOOD_LABELS: Record<number, string> = { 1: 'Difícil', 2: 'Cansado', 3: 'Neutro', 4: 'Calmo', 5: 'Realizado' }
```

---

### Task 11: Commit — Diário

- [ ] **Step 1: Commit**

```bash
git add src/database/migrations/ \
        src/app/Domains/Journal/ \
        src/resources/js/Pages/Journal/ \
        src/resources/js/types/
git commit -m "feat: diário — campo título, card de humor 30d, aside persistente no modo edição"
```

---

### Checklist de verificação final

**Tarefas:**
- [ ] Clicar no checkbox de uma tarefa alterna visualmente e persiste no reload
- [ ] Cada tarefa exibe o campo `tag` (quando preenchido)
- [ ] Inbox lista as tarefas sem prazo (não só a contagem)

**Hábitos:**
- [ ] Dot de hábito usa a cor configurada no cadastro
- [ ] Week dots exibem Seg–Dom da semana atual
- [ ] Humor exibe "Calmo" em vez de "4"
- [ ] Energia exibe "Alta" em vez de "5"
- [ ] Seção de consistência (AreaChart + Insights) visível abaixo da tabela
- [ ] Botão de editar extra removido das linhas de hábito

**Diário:**
- [ ] Título aparece acima do preview em cada entrada da lista
- [ ] Editor tem campo de título acima do Tiptap
- [ ] Card "Humor · 30 dias" visível no aside
- [ ] Aside (calendário + humor + tags) permanece visível ao editar uma entrada
