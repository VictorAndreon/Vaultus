# Plano C — Novas páginas + Stubs estilizados

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Pré-requisito:** Plano A concluído (LibraryItem model criado, Button migrado, CSS grid helpers).

**Goal:** Criar as páginas Tarefas e Biblioteca com dados reais, e transformar os stubs (Notas, Contatos, Revisão) em placeholders visuais elegantes no design system.

**Architecture:** Tarefas e Biblioteca cada uma recebe seu próprio controller no domínio correto, registram rotas reais em `web.php` (substituindo as entradas do loop de stubs), e têm páginas React que consultam os dados via Inertia. Os stubs são simplificados para usar o visual do design system sem nenhum backend.

**Tech Stack:** Laravel 11, Inertia.js, React 18, TypeScript, design system CSS

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| Create | `src/app/Domains/Tasks/Controllers/TasksController.php` |
| Modify | `src/routes/web.php` |
| Create | `src/resources/js/Pages/Tasks/Index.tsx` |
| Create | `src/tests/Feature/Tasks/TasksTest.php` |
| Create | `src/app/Domains/Library/Controllers/LibraryController.php` |
| Create | `src/resources/js/Pages/Library/Index.tsx` |
| Create | `src/tests/Feature/Library/LibraryTest.php` |
| Modify | `src/resources/js/Pages/Stub/Index.tsx` |

---

## Task 1: Página Tarefas

**Referência visual:** `vaultus-modules-a.jsx` → função `Tarefas()`

### 1a. Backend

- [ ] **Step 1: Escrever o teste do controller**

Criar `src/tests/Feature/Tasks/TasksTest.php`:

```php
<?php

namespace Tests\Feature\Tasks;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TasksTest extends TestCase
{
    use RefreshDatabase;

    public function test_tasks_page_requires_auth(): void
    {
        $this->get('/tasks')->assertRedirect('/login');
    }

    public function test_tasks_page_renders_with_correct_props(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Atelier', 'status' => 'active']);
        $col     = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 1]);

        ProjectTask::create([
            'project_id'        => $project->id,
            'project_column_id' => $col->id,
            'title'             => 'Revisar proposta',
            'priority'          => 'high',
            'due_at'            => now(),
            'position'          => 1,
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertStatus(200)
            ->assertInertia(fn($page) => $page
                ->component('Tasks/Index')
                ->has('tasks')
                ->has('stats')
                ->has('by_project')
            );
    }

    public function test_tasks_are_grouped_correctly(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $col     = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 1]);

        // Task today
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $col->id,
            'title' => 'Hoje task', 'due_at' => now(), 'position' => 1,
        ]);
        // Task this week
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $col->id,
            'title' => 'Semana task', 'due_at' => now()->addDays(3), 'position' => 2,
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn($page) => $page
                ->has('tasks', 2)
            );
    }
}
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec app php artisan test --filter=TasksTest
```
Esperado: FAIL — rota `/tasks` renderiza `Stub/Index`.

- [ ] **Step 3: Criar o TasksController**

Criar diretório e arquivo `src/app/Domains/Tasks/Controllers/TasksController.php`:

```bash
mkdir -p src/app/Domains/Tasks/Controllers
```

```php
<?php

namespace App\Domains\Tasks\Controllers;

use App\Domains\Projects\Models\ProjectTask;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class TasksController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user();
        $now      = Carbon::now($user->timezone);
        $today    = $now->toDateString();
        $weekEnd  = $now->copy()->endOfWeek()->toDateString();

        $allTasks = ProjectTask::whereHas(
            'project', fn($q) => $q->where('user_id', $user->id)
        )
        ->with(['project', 'column'])
        ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
        ->orderBy('due_at')
        ->get();

        $isDone = fn($t) => $t->column && (
            str_contains(strtolower($t->column->name), 'done') ||
            str_contains(strtolower($t->column->name), 'conclu')
        );

        $tasks = $allTasks->map(fn($t) => [
            'id'           => $t->id,
            'title'        => $t->title,
            'project_name' => $t->project->title,
            'priority'     => $t->priority,
            'due_at'       => $t->due_at?->format('d/m H:i'),
            'due_date'     => $t->due_at?->toDateString(),
            'is_done'      => $isDone($t),
            'group'        => $isDone($t)
                ? 'done_today'
                : ($t->due_at?->toDateString() === $today ? 'today'
                    : ($t->due_at?->toDateString() <= $weekEnd ? 'week' : 'later')),
        ])->values()->toArray();

        $todayTasks = collect($tasks)->where('due_date', $today);
        $doneTasks  = collect($tasks)->where('is_done', true)->where('due_date', $today);
        $weekTasks  = collect($tasks)->whereBetween('due_date', [$now->copy()->addDay()->toDateString(), $weekEnd]);
        $noDue      = $allTasks->whereNull('due_at')->where(fn($t) => ! $isDone($t));

        $byProject = ProjectTask::whereHas('project', fn($q) => $q->where('user_id', $user->id))
            ->whereNull('due_at')
            ->orWhereHas('project', fn($q) => $q->where('user_id', $user->id))
            ->with('project')
            ->get()
            ->groupBy('project_id')
            ->map(fn($tasks, $id) => [
                'project_name' => $tasks->first()->project->title,
                'count'        => $tasks->count(),
            ])
            ->values()
            ->toArray();

        return Inertia::render('Tasks/Index', [
            'tasks'      => $tasks,
            'stats'      => [
                'today'     => $todayTasks->count(),
                'overdue'   => 0,
                'this_week' => $weekTasks->count(),
                'no_due'    => $noDue->count(),
            ],
            'by_project' => $byProject,
        ]);
    }
}
```

- [ ] **Step 4: Atualizar rota de /tasks em web.php**

Em `src/routes/web.php`, localizar o bloco de stubs:

```php
$stubs = ['tasks', 'library', 'notes', 'contacts', 'reviews'];
foreach ($stubs as $module) {
    Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
}
```

Substituir por:

```php
use App\Domains\Tasks\Controllers\TasksController;
use App\Domains\Library\Controllers\LibraryController;

Route::get('/tasks', [TasksController::class, 'index'])->name('tasks');
Route::get('/library', [LibraryController::class, 'index'])->name('library');

$stubs = ['notes', 'contacts', 'reviews'];
foreach ($stubs as $module) {
    Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
}
```

**Nota:** O `LibraryController` ainda não existe — será criado na Task 2. Criar um controller vazio temporário para o build não quebrar, ou criar ambos antes de commitar.

- [ ] **Step 5: Rodar os testes para ver passar**

```bash
docker compose exec app php artisan test --filter=TasksTest
```
Esperado: todos PASS.

### 1b. Frontend

- [ ] **Step 6: Criar src/resources/js/Pages/Tasks/Index.tsx**

```bash
mkdir -p src/resources/js/Pages/Tasks
```

```tsx
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'

interface Task {
    id: number
    title: string
    project_name: string
    priority: 'high' | 'medium' | 'low' | null
    due_at: string | null
    due_date: string | null
    is_done: boolean
    group: 'today' | 'week' | 'later' | 'done_today'
}

interface Props {
    tasks: Task[]
    stats: { today: number; overdue: number; this_week: number; no_due: number }
    by_project: Array<{ project_name: string; count: number }>
}

const PRIO_TAG: Record<string, string>   = { high: 'tag-rose', medium: 'tag-gold', low: 'tag-sky' }
const PRIO_LABEL: Record<string, string> = { high: 'alta', medium: 'média', low: 'baixa' }
const GROUP_LABEL: Record<string, string> = {
    today: 'Hoje', week: 'Esta semana', later: 'Mais tarde', done_today: 'Concluídas hoje',
}
const GROUP_ORDER = ['today', 'week', 'later', 'done_today']

const PROJECT_COLORS = [
    'var(--green)', 'var(--gold)', 'var(--sky)', 'var(--rose)',
    'oklch(70% 0.13 320)', 'var(--text-3)',
]

export default function TasksIndex({ tasks, stats, by_project }: Props) {
    const groups = GROUP_ORDER.filter(g => tasks.some(t => t.group === g))

    return (
        <AppLayout
            title="Tarefas"
            eyebrow="Execução"
            subtitle={`${stats.today} tarefas para hoje · ${stats.this_week} esta semana.`}
            actions={
                <>
                    <button className="btn btn-ghost btn-sm"><Icons.Filter size={13} /> Filtros</button>
                    <button className="btn btn-primary btn-sm"><Icons.Plus size={13} /> Nova tarefa</button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Stats */}
                <div className="grid g-4">
                    {[
                        { label: 'Hoje',        value: String(stats.today),     unit: `/ ${stats.today + stats.this_week}`, sub: `${stats.today} pendentes` },
                        { label: 'Atrasadas',   value: String(stats.overdue),   sub: stats.overdue === 0 ? 'bom trabalho' : 'requer atenção' },
                        { label: 'Esta semana', value: String(stats.this_week), sub: `${stats.today} alta prioridade` },
                        { label: 'Sem prazo',   value: String(stats.no_due),    sub: 'ver Inbox' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '16px 20px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>
                                {s.value}{s.unit && <span className="unit">{s.unit}</span>}
                            </div>
                            <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
                    {/* Lista de tarefas agrupadas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                        {groups.length === 0 && (
                            <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma tarefa encontrada.</div>
                        )}
                        {groups.map(g => {
                            const groupTasks = tasks.filter(t => t.group === g)
                            return (
                                <div key={g}>
                                    <div className="kicker" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span>{GROUP_LABEL[g]}</span>
                                        <span style={{ color: 'var(--text-4)' }}>· {groupTasks.length}</span>
                                    </div>
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        {groupTasks.map((t, i) => (
                                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                                                <div className="check" data-checked={t.is_done} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ fontSize: 14, color: t.is_done ? 'var(--text-3)' : 'var(--text)', textDecoration: t.is_done ? 'line-through' : 'none' }}>
                                                            {t.title}
                                                        </div>
                                                        {t.priority && !t.is_done && (
                                                            <span className={`tag ${PRIO_TAG[t.priority]}`}><span className="dot" />{PRIO_LABEL[t.priority]}</span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 14, marginTop: 5, fontSize: 11.5, color: 'var(--text-3)' }}>
                                                        <span className="mono">{t.project_name}</span>
                                                        {t.due_at && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                <Icons.Clock size={11} /> {t.due_at}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button className="icon-btn" style={{ width: 28, height: 28, border: 'none' }}><Icons.More size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Aside */}
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="card-head">
                                <div className="card-title">Inbox <b style={{ color: 'var(--green)' }}>· {stats.no_due}</b></div>
                                <a className="card-link">Processar</a>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>
                                {stats.no_due === 0 ? 'Inbox zerado.' : `${stats.no_due} itens sem prazo.`}
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-head"><div className="card-title">Por projeto</div></div>
                            {by_project.slice(0, 6).map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 13 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: 50, background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                                    <span style={{ flex: 1 }}>{p.project_name}</span>
                                    <span className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{p.count}</span>
                                </div>
                            ))}
                        </div>

                        <div className="card">
                            <div className="card-head"><div className="card-title">Atalho</div></div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                                Capture qualquer coisa rapidamente.{' '}
                                <span className="mono" style={{ fontSize: 11, background: 'var(--surface-3)', padding: '1px 6px', borderRadius: 4 }}>⌘N</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </AppLayout>
    )
}
```

- [ ] **Step 7: Type-check e build**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 8: Rodar todos os testes**

```bash
docker compose exec app php artisan test --filter=TasksTest
```
Esperado: todos PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/Domains/Tasks/ \
        src/resources/js/Pages/Tasks/ \
        src/tests/Feature/Tasks/ \
        src/routes/web.php
git commit -m "feat: add Tasks page with real data from project_tasks"
```

---

## Task 2: Página Biblioteca

**Referência visual:** `vaultus-modules-b.jsx` → função `Biblioteca()`

### 2a. Backend

- [ ] **Step 1: Escrever o teste do controller**

Criar `src/tests/Feature/Library/LibraryTest.php`:

```php
<?php

namespace Tests\Feature\Library;

use App\Domains\Auth\Models\User;
use App\Domains\Library\Models\LibraryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LibraryTest extends TestCase
{
    use RefreshDatabase;

    public function test_library_page_requires_auth(): void
    {
        $this->get('/library')->assertRedirect('/login');
    }

    public function test_library_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Livro A',
            'status' => 'reading', 'total_pages' => 300, 'current_page' => 90,
        ]);

        $this->actingAs($user)
            ->get('/library')
            ->assertStatus(200)
            ->assertInertia(fn($page) => $page
                ->component('Library/Index')
                ->has('reading')
                ->has('done_recent')
                ->has('queue')
                ->has('stats')
            );
    }

    public function test_library_reading_only_returns_reading_status(): void
    {
        $user = User::factory()->create();

        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Lendo',
            'status' => 'reading', 'total_pages' => 200, 'current_page' => 50,
        ]);
        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Na fila',
            'status' => 'queue',
        ]);

        $this->actingAs($user)
            ->get('/library')
            ->assertInertia(fn($page) => $page
                ->has('reading', 1)
                ->has('queue', 1)
            );
    }
}
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec app php artisan test --filter=LibraryTest
```
Esperado: FAIL — `LibraryController` não existe.

- [ ] **Step 3: Criar LibraryController**

Criar `src/app/Domains/Library/Controllers/LibraryController.php`:

```php
<?php

namespace App\Domains\Library\Controllers;

use App\Domains\Library\Models\LibraryItem;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class LibraryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $reading = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'reading')
            ->orderBy('started_at', 'desc')
            ->get()
            ->map(fn($b) => [
                'id'               => $b->id,
                'title'            => $b->title,
                'author'           => $b->author,
                'progress_percent' => $b->progress_percent,
                'current_page'     => $b->current_page ?? 0,
                'total_pages'      => $b->total_pages,
                'cover_url'        => $b->cover_url,
                'started_at'       => $b->started_at?->format('M Y'),
            ])
            ->values()
            ->toArray();

        $doneRecent = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->orderBy('finished_at', 'desc')
            ->limit(8)
            ->get()
            ->map(fn($b) => [
                'id'          => $b->id,
                'title'       => $b->title,
                'author'      => $b->author,
                'rating'      => $b->rating,
                'finished_at' => $b->finished_at?->format('M Y'),
            ])
            ->values()
            ->toArray();

        $queue = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'queue')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($b) => [
                'id'     => $b->id,
                'title'  => $b->title,
                'author' => $b->author,
                'added'  => $b->created_at->format('M'),
            ])
            ->values()
            ->toArray();

        $totalYear = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->whereYear('finished_at', now()->year)
            ->count();

        $pagesYear = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->whereNotNull('total_pages')
            ->where('status', 'done')
            ->whereYear('finished_at', now()->year)
            ->sum('total_pages');

        return Inertia::render('Library/Index', [
            'reading'     => $reading,
            'done_recent' => $doneRecent,
            'queue'       => $queue,
            'stats'       => [
                'total_year'    => $totalYear,
                'in_progress'   => count($reading),
                'pages_year'    => (int) $pagesYear,
                'queue_count'   => LibraryItem::where('user_id', $user->id)->where('type', 'book')->where('status', 'queue')->count(),
            ],
        ]);
    }
}
```

- [ ] **Step 4: Rodar os testes para ver passar**

```bash
docker compose exec app php artisan test --filter=LibraryTest
```
Esperado: todos PASS.

### 2b. Frontend

- [ ] **Step 5: Criar src/resources/js/Pages/Library/Index.tsx**

```bash
mkdir -p src/resources/js/Pages/Library
```

```tsx
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'

interface BookReading {
    id: number; title: string; author: string | null
    progress_percent: number; current_page: number; total_pages: number | null
    cover_url: string | null; started_at: string | null
}

interface BookDone {
    id: number; title: string; author: string | null
    rating: number | null; finished_at: string | null
}

interface BookQueue {
    id: number; title: string; author: string | null; added: string
}

interface Props {
    reading: BookReading[]
    done_recent: BookDone[]
    queue: BookQueue[]
    stats: { total_year: number; in_progress: number; pages_year: number; queue_count: number }
}

function Stars({ rating }: { rating: number | null }) {
    if (!rating) return null
    return (
        <div style={{ display: 'flex', gap: 1, color: 'var(--gold)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Icons.Star key={i} size={12} style={{ fill: i < rating ? 'currentColor' : 'transparent' }} />
            ))}
        </div>
    )
}

export default function LibraryIndex({ reading, done_recent, queue, stats }: Props) {
    return (
        <AppLayout
            title="Biblioteca"
            eyebrow="Acervo"
            subtitle={`${stats.total_year} livros · ${stats.in_progress} em curso · ${stats.queue_count} na fila.`}
            actions={
                <button className="btn btn-primary btn-sm">
                    <Icons.Plus size={13} /> Adicionar livro
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div className="grid g-4">
                    {[
                        { label: 'Livros · 2026',    value: String(stats.total_year),  sub: `meta 24 · ${Math.round(stats.total_year / 24 * 100)}%` },
                        { label: 'Em curso',         value: String(stats.in_progress), sub: 'leituras ativas' },
                        { label: 'Páginas no ano',   value: stats.pages_year.toLocaleString('pt-BR'), sub: 'páginas lidas' },
                        { label: 'Na fila',          value: String(stats.queue_count), sub: 'prontos para ler' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '18px 22px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
                            <div className="stat-delta flat" style={{ marginTop: 4 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Em leitura */}
                <div>
                    <div className="kicker" style={{ marginBottom: 12 }}>Em leitura · {reading.length}</div>
                    {reading.length === 0 ? (
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro em leitura.</div>
                    ) : (
                        <div className="grid g-3">
                            {reading.map(b => (
                                <div key={b.id} className="card" style={{ padding: 20 }}>
                                    <div style={{ display: 'flex', gap: 18 }}>
                                        {b.cover_url ? (
                                            <img src={b.cover_url} style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }} />
                                        ) : (
                                            <div className="ph" style={{ width: 80, height: 120, flex: 'none' }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 className="h-3" style={{ fontSize: 15 }}>{b.title}</h3>
                                            {b.author && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{b.author}</div>}
                                            {b.started_at && <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8 }}>iniciado · {b.started_at}</div>}
                                            {b.total_pages && (
                                                <div style={{ marginTop: 14 }}>
                                                    <div className="meter"><span style={{ width: `${b.progress_percent}%` }} /></div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                                                        <span className="mono">{b.current_page}/{b.total_pages} pg</span>
                                                        <span className="mono" style={{ color: 'var(--green)' }}>{b.progress_percent}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Concluídos + Fila */}
                <div className="grid g-12-5">
                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Concluídos · recentes</div>
                        <div className="card" style={{ padding: 0 }}>
                            {done_recent.length === 0 ? (
                                <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro concluído ainda.</div>
                            ) : (
                                done_recent.map((b, i) => (
                                    <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                                        <div className="ph" style={{ width: 32, height: 46, flex: 'none', fontSize: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="h-3" style={{ fontSize: 14 }}>{b.title}</div>
                                            {b.author && <div className="muted" style={{ fontSize: 12 }}>{b.author}</div>}
                                        </div>
                                        <Stars rating={b.rating} />
                                        {b.finished_at && <div className="mono muted" style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>{b.finished_at}</div>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Fila · {stats.queue_count}</div>
                        <div className="card" style={{ padding: 0 }}>
                            {queue.length === 0 ? (
                                <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Fila vazia.</div>
                            ) : (
                                queue.map((b, i) => (
                                    <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                                        <div className="mono muted-2" style={{ fontSize: 11, width: 24 }}>{(i + 1).toString().padStart(2, '0')}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13.5 }}>{b.title}</div>
                                            {b.author && <div className="muted" style={{ fontSize: 11.5 }}>{b.author}</div>}
                                        </div>
                                        <div className="mono muted" style={{ fontSize: 11 }}>{b.added}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
```

- [ ] **Step 6: Type-check e build**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add src/app/Domains/Library/Controllers/ \
        src/resources/js/Pages/Library/ \
        src/tests/Feature/Library/ \
        src/routes/web.php
git commit -m "feat: add Library page with real data from library_items"
```

---

## Task 3: Stubs estilizados

**Afeta:** Notas, Contatos, Revisão (todos ainda usam `Stub/Index`)

- [ ] **Step 1: Reescrever Stub/Index.tsx**

```tsx
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'

interface Props { module: string }

const MODULE_CONFIG: Record<string, {
    label: string; eyebrow: string; subtitle: string; icon: keyof typeof Icons
}> = {
    notes:    { label: 'Notas',    eyebrow: 'Acervo',   subtitle: 'Ideias, capturas e referência rápida.',       icon: 'Note' },
    contacts: { label: 'Contatos', eyebrow: 'Rede',     subtitle: 'Pessoas que importam, com contexto.',         icon: 'Contact' },
    reviews:  { label: 'Revisão',  eyebrow: 'Cadência', subtitle: 'Revisão semanal, mensal e trimestral.',        icon: 'Review' },
}

const DEFAULT_CONFIG = { label: 'Em breve', eyebrow: 'Sistema', subtitle: 'Módulo em construção.', icon: 'Star' as keyof typeof Icons }

export default function Stub({ module }: Props) {
    const config = MODULE_CONFIG[module] ?? DEFAULT_CONFIG
    const Icon   = Icons[config.icon]

    return (
        <AppLayout
            title={config.label}
            eyebrow={config.eyebrow}
            subtitle={config.subtitle}
        >
            <div className="card" style={{ padding: '56px 32px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--green-soft)', color: 'var(--green-bright)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                    <Icon size={24} />
                </div>
                <h2 className="h-2" style={{ marginBottom: 10 }}>{config.label}</h2>
                <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6, maxWidth: '36ch', margin: '0 auto 24px' }}>
                    Este módulo está em desenvolvimento e estará disponível em breve.
                </p>
                <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.5 }}>
                    Receber aviso quando disponível
                </button>
            </div>
        </AppLayout>
    )
}
```

- [ ] **Step 2: Type-check e build**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/resources/js/Pages/Stub/Index.tsx
git commit -m "style: update Stub pages to design system visual"
```
