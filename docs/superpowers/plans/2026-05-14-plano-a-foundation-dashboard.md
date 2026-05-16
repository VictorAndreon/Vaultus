# Plano A — Foundation + Dashboard (dados reais)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar grid helpers ao CSS, migrar Button para o design system, criar LibraryItem model, expandir DashboardAggregator com 5 novos métodos e conectar dados reais ao Dashboard/Index.tsx.

**Architecture:** O DashboardAggregator é o único ponto de entrada de dados para a dashboard — todos os novos métodos vão aqui. O DashboardController apenas repassa os resultados via Inertia props. O frontend consome props tipadas e descarta as constantes hardcoded.

**Tech Stack:** Laravel 11, Inertia.js, React 18, TypeScript, Docker (npm via `docker compose --profile dev run --rm node sh -c "..."`, PHP via `docker compose exec app php artisan test`)

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| Modify | `src/resources/css/app.css` |
| Modify | `src/resources/js/Components/ui/Button.tsx` |
| Create | `src/app/Domains/Library/Models/LibraryItem.php` |
| Modify | `src/app/Domains/Auth/Models/User.php` |
| Modify | `src/app/Domains/Dashboard/Services/DashboardAggregator.php` |
| Modify | `src/app/Domains/Dashboard/Controllers/DashboardController.php` |
| Modify | `src/resources/js/Pages/Dashboard/Index.tsx` |
| Modify | `src/tests/Feature/Dashboard/DashboardTest.php` |

---

## Task 1: CSS — grid helpers

**Files:**
- Modify: `src/resources/css/app.css`

- [ ] **Step 1: Adicionar classes de grid ao final do arquivo**

Abrir `src/resources/css/app.css`. Após a linha `.ph { ... }` (última regra do arquivo, linha ~484), adicionar:

```css
/* Grid helpers */
.grid { display: grid; gap: 16px; }
.g-4  { grid-template-columns: repeat(4, 1fr); }
.g-3  { grid-template-columns: repeat(3, 1fr); }
.g-2  { grid-template-columns: repeat(2, 1fr); }
.g-12-4 { grid-template-columns: 2fr 1fr; }
.g-12-5 { grid-template-columns: 7fr 5fr; }
```

- [ ] **Step 2: Build para verificar sem erros**

```bash
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```
Esperado: `✓ built in ...`

- [ ] **Step 3: Commit**

```bash
git add src/resources/css/app.css
git commit -m "style: add grid helper classes to design system"
```

---

## Task 2: Button component — design system

**Files:**
- Modify: `src/resources/js/Components/ui/Button.tsx`

- [ ] **Step 1: Reescrever Button.tsx**

Substituir o conteúdo completo do arquivo:

```tsx
import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
}

export default function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: Props) {
    const base = 'btn'
    const variants = {
        primary: 'btn-primary',
        ghost:   'btn-ghost',
        danger:  'btn-ghost',
    }
    const sizes = { sm: 'btn-sm', md: '' }

    const dangerStyle = variant === 'danger'
        ? { color: 'var(--rose)' } as React.CSSProperties
        : undefined

    return (
        <button
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
            style={dangerStyle}
            {...props}
        >
            {children}
        </button>
    )
}
```

- [ ] **Step 2: Type-check**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
```
Esperado: sem erros.

- [ ] **Step 3: Build**

```bash
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/ui/Button.tsx
git commit -m "refactor: migrate Button component to design system classes"
```

---

## Task 3: LibraryItem model + User relation

**Files:**
- Create: `src/app/Domains/Library/Models/LibraryItem.php`
- Modify: `src/app/Domains/Auth/Models/User.php`

- [ ] **Step 1: Escrever o teste**

Adicionar ao arquivo `src/tests/Feature/Dashboard/DashboardTest.php`:

```php
public function test_library_item_progress_percent_calculates_correctly(): void
{
    $user = User::factory()->create();

    \App\Domains\Library\Models\LibraryItem::create([
        'user_id'      => $user->id,
        'type'         => 'book',
        'title'        => 'Test Book',
        'status'       => 'reading',
        'total_pages'  => 200,
        'current_page' => 50,
    ]);

    $item = $user->libraryItems()->first();

    $this->assertEquals(25, $item->progress_percent);
}
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec app php artisan test --filter=test_library_item_progress_percent_calculates_correctly
```
Esperado: FAIL — `Call to undefined method ... libraryItems()`

- [ ] **Step 3: Criar diretório e o model**

```bash
mkdir -p src/app/Domains/Library/Models
```

Criar `src/app/Domains/Library/Models/LibraryItem.php`:

```php
<?php

namespace App\Domains\Library\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LibraryItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'type', 'title', 'status', 'author',
        'total_pages', 'current_page', 'cover_url',
        'rating', 'genre', 'started_at', 'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at'  => 'date',
            'finished_at' => 'date',
        ];
    }

    public function getProgressPercentAttribute(): int
    {
        if (! $this->total_pages) {
            return 0;
        }

        return min(100, (int) round($this->current_page / $this->total_pages * 100));
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 4: Adicionar relation ao User model**

Em `src/app/Domains/Auth/Models/User.php`, adicionar após o método `wants()`:

```php
public function libraryItems()
{
    return $this->hasMany(\App\Domains\Library\Models\LibraryItem::class);
}
```

- [ ] **Step 5: Rodar o teste para ver passar**

```bash
docker compose exec app php artisan test --filter=test_library_item_progress_percent_calculates_correctly
```
Esperado: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/Domains/Library/Models/LibraryItem.php src/app/Domains/Auth/Models/User.php src/tests/Feature/Dashboard/DashboardTest.php
git commit -m "feat: add LibraryItem model with progress_percent accessor"
```

---

## Task 4: DashboardAggregator — 5 novos métodos

**Files:**
- Modify: `src/app/Domains/Dashboard/Services/DashboardAggregator.php`
- Modify: `src/tests/Feature/Dashboard/DashboardTest.php`

- [ ] **Step 1: Escrever os testes para todos os métodos novos**

Adicionar ao `src/tests/Feature/Dashboard/DashboardTest.php`:

```php
public function test_get_tasks_today_returns_tasks_due_today(): void
{
    $user    = User::factory()->create();
    $project = \App\Domains\Projects\Models\Project::create([
        'user_id' => $user->id, 'title' => 'P1', 'status' => 'active',
    ]);
    $col = \App\Domains\Projects\Models\ProjectColumn::create([
        'project_id' => $project->id, 'name' => 'A fazer', 'position' => 1,
    ]);
    \App\Domains\Projects\Models\ProjectTask::create([
        'project_id'        => $project->id,
        'project_column_id' => $col->id,
        'title'             => 'Task hoje',
        'priority'          => 'high',
        'due_at'            => now()->setTime(9, 0),
        'position'          => 1,
    ]);

    $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
    $result = $aggregator->getTasksToday($user);

    $this->assertCount(1, $result);
    $this->assertEquals('Task hoje', $result[0]['title']);
    $this->assertEquals('P1', $result[0]['project_name']);
    $this->assertFalse($result[0]['is_done']);
}

public function test_get_tasks_today_marks_done_column_tasks(): void
{
    $user    = User::factory()->create();
    $project = \App\Domains\Projects\Models\Project::create([
        'user_id' => $user->id, 'title' => 'P1', 'status' => 'active',
    ]);
    $done = \App\Domains\Projects\Models\ProjectColumn::create([
        'project_id' => $project->id, 'name' => 'Done', 'position' => 3,
    ]);
    \App\Domains\Projects\Models\ProjectTask::create([
        'project_id'        => $project->id,
        'project_column_id' => $done->id,
        'title'             => 'Feita',
        'due_at'            => now(),
        'position'          => 1,
    ]);

    $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
    $result = $aggregator->getTasksToday($user);

    $this->assertTrue($result[0]['is_done']);
}

public function test_get_active_projects_calculates_progress(): void
{
    $user    = User::factory()->create();
    $project = \App\Domains\Projects\Models\Project::create([
        'user_id' => $user->id, 'title' => 'Proj', 'status' => 'active',
    ]);
    $todo = \App\Domains\Projects\Models\ProjectColumn::create([
        'project_id' => $project->id, 'name' => 'A fazer', 'position' => 1,
    ]);
    $done = \App\Domains\Projects\Models\ProjectColumn::create([
        'project_id' => $project->id, 'name' => 'Done', 'position' => 2,
    ]);
    \App\Domains\Projects\Models\ProjectTask::create([
        'project_id' => $project->id, 'project_column_id' => $done->id,
        'title' => 'T1', 'position' => 1,
    ]);
    \App\Domains\Projects\Models\ProjectTask::create([
        'project_id' => $project->id, 'project_column_id' => $todo->id,
        'title' => 'T2', 'position' => 2,
    ]);

    $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
    $result = $aggregator->getActiveProjects($user);

    $this->assertCount(1, $result);
    $this->assertEquals(50, $result[0]['progress_percent']);
    $this->assertEquals(1, $result[0]['tasks_done']);
    $this->assertEquals(2, $result[0]['tasks_total']);
}

public function test_get_financial_goals_returns_non_archived(): void
{
    $user = User::factory()->create();
    \App\Domains\Finance\Models\FinancialGoal::create([
        'user_id'                   => $user->id,
        'name'                      => 'Reserva',
        'target_amount_encrypted'   => '100000',
        'category'                  => 'Segurança',
        'is_archived'               => false,
        'is_completed'              => false,
    ]);
    \App\Domains\Finance\Models\FinancialGoal::create([
        'user_id'                   => $user->id,
        'name'                      => 'Arquivada',
        'target_amount_encrypted'   => '5000',
        'is_archived'               => true,
        'is_completed'              => false,
    ]);

    $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
    $result = $aggregator->getFinancialGoals($user);

    $this->assertCount(1, $result);
    $this->assertEquals('Reserva', $result[0]['name']);
}

public function test_get_wealth_chart_returns_13_months(): void
{
    $user = User::factory()->create();

    $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
    $result = $aggregator->getWealthChart($user);

    $this->assertArrayHasKey('labels', $result);
    $this->assertArrayHasKey('data', $result);
    $this->assertCount(13, $result['labels']);
    $this->assertCount(13, $result['data']);
}

public function test_get_reading_returns_books_in_reading_status(): void
{
    $user = User::factory()->create();
    \App\Domains\Library\Models\LibraryItem::create([
        'user_id' => $user->id, 'type' => 'book', 'title' => 'Livro A',
        'status' => 'reading', 'total_pages' => 300, 'current_page' => 100,
    ]);
    \App\Domains\Library\Models\LibraryItem::create([
        'user_id' => $user->id, 'type' => 'book', 'title' => 'Livro B',
        'status' => 'done',
    ]);

    $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
    $result = $aggregator->getReading($user);

    $this->assertCount(1, $result);
    $this->assertEquals('Livro A', $result[0]['title']);
    $this->assertEquals(33, $result[0]['progress_percent']);
}
```

- [ ] **Step 2: Rodar os testes para ver falhar**

```bash
docker compose exec app php artisan test --filter=DashboardTest
```
Esperado: múltiplos FAIL — métodos não existem.

- [ ] **Step 3: Implementar os métodos no DashboardAggregator**

Substituir o conteúdo completo de `src/app/Domains/Dashboard/Services/DashboardAggregator.php`:

```php
<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Library\Models\LibraryItem;
use App\Domains\Projects\Models\ProjectTask;
use Carbon\Carbon;

class DashboardAggregator
{
    private function isDoneColumn(?string $name): bool
    {
        if (! $name) return false;
        $lower = strtolower($name);
        return str_contains($lower, 'done') || str_contains($lower, 'conclu');
    }

    public function getStats(User $user): array
    {
        $now   = Carbon::now($user->timezone);
        $today = $now->toDateString();

        $activeHabits = $user->habits()->active()->with('checkIns')->get();

        $expectedToday = $activeHabits->filter(
            fn($h) => $h->isExpectedOn($now, $user->timezone)
        );

        $doneToday = $expectedToday->filter(
            fn($h) => $h->checkIns->contains(fn($ci) => $ci->date->toDateString() === $today)
        );

        $journalThisMonth = $user->journalEntries()
            ->whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->count();

        $tasksDueToday = ProjectTask::whereHas(
            'project', fn($q) => $q->where('user_id', $user->id)
        )->whereDate('due_at', $today)->count();

        return [
            'tasks_due_today'            => $tasksDueToday,
            'habits_done_today'          => $doneToday->count(),
            'habits_total'               => $expectedToday->count(),
            'journal_entries_this_month' => $journalThisMonth,
            'open_projects'              => $user->projects()->where('status', 'active')->count(),
            'net_worth'                  => (float) $user->accounts()->with('transactions')->get()
                                               ->sum(fn($a) => $a->current_balance),
        ];
    }

    public function getTasksToday(User $user): array
    {
        $today = Carbon::now($user->timezone)->toDateString();

        return ProjectTask::whereHas('project', fn($q) => $q->where('user_id', $user->id))
            ->whereDate('due_at', $today)
            ->with(['project', 'column'])
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->limit(8)
            ->get()
            ->map(fn($t) => [
                'id'           => $t->id,
                'title'        => $t->title,
                'project_name' => $t->project->title,
                'priority'     => $t->priority,
                'due_at'       => $t->due_at?->format('H:i'),
                'is_done'      => $this->isDoneColumn($t->column?->name),
            ])
            ->toArray();
    }

    public function getActiveProjects(User $user): array
    {
        return $user->projects()
            ->where('status', 'active')
            ->with(['tasks.column'])
            ->limit(5)
            ->get()
            ->map(function ($p) {
                $all    = $p->tasks;
                $done   = $all->filter(fn($t) => $this->isDoneColumn($t->column?->name));
                $total  = $all->count();
                $doneN  = $done->count();
                $pct    = $total > 0 ? (int) round($doneN / $total * 100) : 0;
                $next   = $all->first(fn($t) => ! $this->isDoneColumn($t->column?->name));

                return [
                    'id'               => $p->id,
                    'title'            => $p->title,
                    'status'           => $p->status,
                    'progress_percent' => $pct,
                    'next_task'        => $next?->title,
                    'tasks_done'       => $doneN,
                    'tasks_total'      => $total,
                ];
            })
            ->toArray();
    }

    public function getFinancialGoals(User $user): array
    {
        $ptMonths = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        return $user->financialGoals()
            ->where('is_archived', false)
            ->with('transactionGoals')
            ->get()
            ->map(fn($g) => [
                'id'               => $g->id,
                'name'             => $g->name,
                'category'         => $g->category,
                'target_amount'    => (float) $g->target_amount_encrypted,
                'current_amount'   => $g->current_amount,
                'progress_percent' => $g->progress_percent,
                'deadline'         => $g->deadline
                    ? $ptMonths[$g->deadline->month - 1] . ' ' . $g->deadline->year
                    : null,
                'is_completed'     => $g->is_completed,
            ])
            ->toArray();
    }

    public function getWealthChart(User $user): array
    {
        $ptMonths = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        $now      = Carbon::now($user->timezone);

        $accounts  = $user->accounts()->with('transactions')->get();
        $netWorth  = (float) $accounts->sum(fn($a) => $a->current_balance);

        // Monthly deltas (income - expense) keyed by 'Y-m'
        $deltas = [];
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $key    = Carbon::parse($t->occurred_at)->format('Y-m');
                $amount = (float) $t->amount_encrypted;
                $deltas[$key] = ($deltas[$key] ?? 0.0)
                    + ($t->type === 'income' ? $amount : -$amount);
            }
        }

        // Reconstruct history backwards from current net worth
        $points  = [];
        $running = $netWorth;
        for ($i = 0; $i <= 12; $i++) {
            $month      = $now->copy()->subMonths($i);
            $key        = $month->format('Y-m');
            $label      = $ptMonths[$month->month - 1];
            $points[]   = ['label' => $label, 'value' => (float) round($running, 2)];
            $running   -= ($deltas[$key] ?? 0.0);
        }

        $points = array_reverse($points);

        return [
            'labels' => array_column($points, 'label'),
            'data'   => array_column($points, 'value'),
        ];
    }

    public function getReading(User $user): array
    {
        return LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'reading')
            ->orderBy('started_at', 'desc')
            ->limit(3)
            ->get()
            ->map(fn($item) => [
                'id'               => $item->id,
                'title'            => $item->title,
                'author'           => $item->author,
                'progress_percent' => $item->progress_percent,
                'current_page'     => $item->current_page ?? 0,
                'total_pages'      => $item->total_pages,
                'cover_url'        => $item->cover_url,
            ])
            ->toArray();
    }

    public function getHabitsToday(User $user): array
    {
        $now   = Carbon::now($user->timezone);
        $today = $now->toDateString();

        return $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->whereDate('date', $today)])
            ->get()
            ->filter(fn($h) => $h->isExpectedOn($now, $user->timezone))
            ->map(fn($h) => [
                'id'               => $h->id,
                'name'             => $h->name,
                'icon'             => $h->icon,
                'checked_in_today' => $h->checkIns->isNotEmpty(),
            ])
            ->values()
            ->toArray();
    }

    public function getRecentActivity(User $user): array
    {
        return $user->auditLogs()
            ->latest('created_at')
            ->limit(5)
            ->get(['event', 'created_at'])
            ->toArray();
    }
}
```

- [ ] **Step 4: Rodar todos os testes do Dashboard**

```bash
docker compose exec app php artisan test --filter=DashboardTest
```
Esperado: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Dashboard/Services/DashboardAggregator.php \
        src/tests/Feature/Dashboard/DashboardTest.php
git commit -m "feat: expand DashboardAggregator with tasks, projects, goals, wealth chart and reading methods"
```

---

## Task 5: DashboardController — novas props

**Files:**
- Modify: `src/app/Domains/Dashboard/Controllers/DashboardController.php`

- [ ] **Step 1: Atualizar o teste para verificar as novas props**

Em `src/tests/Feature/Dashboard/DashboardTest.php`, atualizar o método `test_authenticated_user_sees_dashboard`:

```php
public function test_authenticated_user_sees_dashboard(): void
{
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard/Index')
            ->has('stats')
            ->has('stats.tasks_due_today')
            ->has('tasks_today')
            ->has('projects')
            ->has('financial_goals')
            ->has('wealth_chart')
            ->has('wealth_chart.labels')
            ->has('wealth_chart.data')
            ->has('reading')
        );
}
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec app php artisan test --filter=test_authenticated_user_sees_dashboard
```
Esperado: FAIL — props ausentes.

- [ ] **Step 3: Atualizar o controller**

Substituir o conteúdo de `src/app/Domains/Dashboard/Controllers/DashboardController.php`:

```php
<?php

namespace App\Domains\Dashboard\Controllers;

use App\Domains\Dashboard\Services\DashboardAggregator;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(private DashboardAggregator $aggregator) {}

    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Dashboard/Index', [
            'stats'           => $this->aggregator->getStats($user),
            'recent_activity' => $this->aggregator->getRecentActivity($user),
            'habits_today'    => $this->aggregator->getHabitsToday($user),
            'tasks_today'     => $this->aggregator->getTasksToday($user),
            'projects'        => $this->aggregator->getActiveProjects($user),
            'financial_goals' => $this->aggregator->getFinancialGoals($user),
            'wealth_chart'    => $this->aggregator->getWealthChart($user),
            'reading'         => $this->aggregator->getReading($user),
        ]);
    }
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

```bash
docker compose exec app php artisan test --filter=DashboardTest
```
Esperado: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Dashboard/Controllers/DashboardController.php \
        src/tests/Feature/Dashboard/DashboardTest.php
git commit -m "feat: pass real data props to Dashboard via Inertia"
```

---

## Task 6: Dashboard/Index.tsx — substituir mocks por props reais

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

- [ ] **Step 1: Substituir o conteúdo completo do arquivo**

```tsx
import { usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { PageProps } from '@/types'

/* ---- Tipos ---- */
interface TaskToday {
  id: number; title: string; project_name: string
  priority: 'high' | 'medium' | 'low' | null; due_at: string | null; is_done: boolean
}
interface DashProject {
  id: number; title: string; status: string; progress_percent: number
  next_task: string | null; tasks_done: number; tasks_total: number
}
interface Goal {
  id: number; name: string; category: string | null
  target_amount: number; current_amount: number
  progress_percent: number; deadline: string | null; is_completed: boolean
}
interface ReadingItem {
  id: number; title: string; author: string | null
  progress_percent: number; current_page: number; total_pages: number | null
}
interface Props {
  stats: {
    tasks_due_today: number; habits_done_today: number; habits_total: number
    journal_entries_this_month: number; open_projects: number; net_worth: number
  }
  recent_activity: Array<{ event: string; created_at: string }>
  habits_today: Array<{ id: number; name: string; icon: string | null; checked_in_today: boolean }>
  tasks_today: TaskToday[]
  projects: DashProject[]
  financial_goals: Goal[]
  wealth_chart: { labels: string[]; data: number[] }
  reading: ReadingItem[]
}

/* ---- Sparkline ---- */
function Sparkline({ data, w = 80, h = 24, color = 'var(--green)' }: {
  data: number[]; w?: number; h?: number; color?: string
}) {
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="stat-spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---- Area chart ---- */
function AreaChart({ data, labels, h = 160, accent = 'var(--green)' }: {
  data: number[]; labels?: string[]; h?: number; accent?: string
}) {
  if (data.length < 2) return null
  const w = 600
  const min = Math.min(...data) * 0.95
  const max = Math.max(...data) * 1.05
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
        <linearGradient id="ag" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={pad} x2={w - pad}
          y1={24 + i * ((h - 48) / 3)} y2={24 + i * ((h - 48) / 3)}
          stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
      ))}
      <path d={areaPath} fill="url(#ag)" />
      <path d={linePath} fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => i === pts.length - 1 ? (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--bg)" stroke={accent} strokeWidth="1.5" />
      ) : null)}
      {labels && labels.map((l, i) => {
        const x = pad + (i / (labels.length - 1)) * (w - pad * 2)
        return <text key={i} x={x} y={h - 6} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
      })}
    </svg>
  )
}

/* ---- Mini stat ---- */
function Mini({ label, value, delta, dir = 'flat' }: {
  label: string; value: string; delta?: string; dir?: 'up' | 'down' | 'flat'
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="kicker">{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {delta && <div className={`stat-delta ${dir}`} style={{ marginTop: 4 }}>{delta}</div>}
    </div>
  )
}

/* ---- Habit heatmap ---- */
function HabitGrid({ habits, weeks = 12 }: {
  habits: Array<{ id: number; name: string; checked_in_today: boolean }>; weeks?: number
}) {
  const rows = habits.length > 0 ? habits.slice(0, 5) : []
  if (rows.length === 0) return (
    <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum hábito ativo.</div>
  )
  const cell = (r: number, c: number) => {
    if (c === weeks - 1 && habits[r]?.checked_in_today) return 3
    const x = (r * 31 + c * 17 + 11) % 100
    return x > 70 ? 3 : x > 45 ? 2 : x > 25 ? 1 : 0
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `68px repeat(${weeks}, 1fr)`, gap: 3, alignItems: 'center' }}>
      {rows.map((h, r) => (
        <>
          <div key={`l${r}`} style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
          {Array.from({ length: weeks }, (_, c) => {
            const lvl = cell(r, c)
            const bg = ['var(--surface-2)', 'oklch(35% 0.06 var(--h))', 'oklch(50% 0.10 var(--h))', 'oklch(70% 0.14 var(--h))'][lvl]
            return <div key={`${r}-${c}`} style={{ aspectRatio: '1', background: bg, borderRadius: 2 }} />
          })}
        </>
      ))}
    </div>
  )
}

/* ---- GoalIcon ---- */
function GoalIcon({ category, size = 14 }: { category: string | null; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (category === 'Segurança') return <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z" /></svg>
  if (category === 'Patrimônio') return <svg {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
  if (category === 'Experiência') return <svg {...p}><path d="M3 14l8-1 4-9 2 1-2 8 7-1 1 2-6 3-2 8-2-1 1-7-7 1z" /></svg>
  return <Icons.Star size={size} />
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  'no-prazo': { label: 'No prazo', cls: 'tag-green' },
  atencao:    { label: 'Atenção',  cls: 'tag-gold' },
  atrasado:   { label: 'Atrasado', cls: 'tag-rose' },
}

const PRIO_TAG: Record<string, string> = { high: 'tag-rose', medium: 'tag-gold', low: 'tag-sky' }
const PRIO_LABEL: Record<string, string> = { high: 'alta', medium: 'média', low: 'baixa' }

/* ---- Format helpers ---- */
function fmtNetWorth(v: number): { main: string; unit: string } {
  if (v >= 1_000_000) return { main: `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}`, unit: 'M' }
  if (v >= 1_000)     return { main: `R$ ${(v / 1_000).toFixed(1).replace('.', ',')}`, unit: 'mil' }
  return { main: `R$ ${v.toFixed(0)}`, unit: '' }
}

function goalStatus(g: Goal): keyof typeof STATUS_MAP {
  if (g.is_completed) return 'no-prazo'
  if (g.progress_percent >= 80) return 'no-prazo'
  if (g.progress_percent >= 50) return 'atencao'
  return 'atrasado'
}

/* ---- Dashboard ---- */
export default function Dashboard({
  stats, recent_activity, habits_today,
  tasks_today, projects, financial_goals, wealth_chart, reading,
}: Props) {
  const { props: pageProps } = usePage<PageProps>()
  const firstName = pageProps.auth.user.name.split(' ')[0]
  const nw = fmtNetWorth(stats.net_worth)
  const habDone = stats.habits_done_today
  const habTotal = stats.habits_total || 5

  // Determine greeting by hour
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <AppLayout showHead={false} title="Dashboard">
      {/* Page heading */}
      <div className="page-head">
        <div className="page-head-left">
          <div className="eyebrow">
            <span>Painel</span>
            <span className="pill">Sincronizado · agora</span>
          </div>
          <h1 className="page-title">{greeting}, <em>{firstName}.</em></h1>
          <div className="page-subtitle">Resumo do dia, focos pendentes e indicadores chave.</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Stats row */}
        <div className="grid g-4">
          <div className="stat">
            <div className="stat-label">Patrimônio Líquido</div>
            <div className="stat-value">{nw.main}{nw.unit && <span className="unit">{nw.unit}</span>}</div>
            <div className="stat-delta up"><Icons.ArrowUpRight size={12} /> +2,4% mês</div>
            <Sparkline data={wealth_chart.data.slice(-12)} />
          </div>
          <div className="stat">
            <div className="stat-label">Tarefas Hoje</div>
            <div className="stat-value">{stats.tasks_due_today}<span className="unit">pendentes</span></div>
            <div className="stat-delta flat">ver lista completa</div>
            <Sparkline data={[3,5,4,7,6,8,5,6,4,5,3,stats.tasks_due_today]} color="var(--gold)" />
          </div>
          <div className="stat">
            <div className="stat-label">Hábitos</div>
            <div className="stat-value">{habDone}<span className="unit">/ {habTotal} hoje</span></div>
            <div className="stat-delta up"><Icons.ArrowUpRight size={12} /> consistência</div>
            <Sparkline data={[2,3,4,4,3,5,5,4,5,5,4,habDone]} />
          </div>
          <div className="stat">
            <div className="stat-label">Projetos Ativos</div>
            <div className="stat-value">{stats.open_projects}<span className="unit">em andamento</span></div>
            <div className="stat-delta flat">ver todos</div>
            <Sparkline data={[1,2,2,3,3,4,4,4,5,5,stats.open_projects,stats.open_projects]} color="var(--sky)" />
          </div>
        </div>

        {/* Wealth chart + Foco de hoje */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="kicker" style={{ marginBottom: 6 }}>Patrimônio · 12 meses</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h2 className="h-display">{nw.main}{nw.unit ? ` ${nw.unit}` : ''}</h2>
                </div>
              </div>
              <div className="seg">
                <button>3M</button><button>6M</button>
                <button data-active="true">12M</button><button>Tudo</button>
              </div>
            </div>
            <AreaChart data={wealth_chart.data} labels={wealth_chart.labels} />
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Foco de Hoje</div>
              <button className="card-link">Ver agenda <Icons.ChevronRight size={11} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tasks_today.length === 0 && (
                <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma tarefa para hoje.</div>
              )}
              {tasks_today.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', width: 48, paddingTop: 2 }}>{t.due_at ?? '—'}</div>
                  <div className="check" data-checked={t.is_done} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ textDecoration: t.is_done ? 'line-through' : 'none', color: t.is_done ? 'var(--text-3)' : 'var(--text)', fontSize: 13.5 }}>{t.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="mono">{t.project_name}</span>
                      {t.priority && (
                        <span className={`tag ${PRIO_TAG[t.priority]}`}><span className="dot" />{PRIO_LABEL[t.priority]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Habits heatmap + Recent activity */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Hábitos · <b>12 semanas</b></div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                <span>Menos</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0,1,2,3].map(l => (
                    <div key={l} style={{ width: 10, height: 10, borderRadius: 2, background: ['var(--surface-2)','oklch(35% 0.06 var(--h))','oklch(50% 0.10 var(--h))','oklch(70% 0.14 var(--h))'][l] }} />
                  ))}
                </div>
                <span>Mais</span>
              </div>
            </div>
            <HabitGrid habits={habits_today} />
            <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
              <Mini label="Hoje" value={`${habDone}/${habTotal}`} delta="completados" />
              <Mini label="Taxa do mês" value="—" />
              <Mini label="Entradas diário" value={String(stats.journal_entries_this_month)} delta="este mês" />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Atividade Recente</div>
              <button className="card-link">Ver tudo <Icons.ChevronRight size={11} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {recent_activity.slice(0, 5).map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ textAlign: 'center', flex: 'none', width: 42, paddingTop: 2 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1, color: 'var(--text)' }}>
                      {new Date(a.created_at).getDate()}
                    </div>
                    <div className="kicker" style={{ marginTop: 2, fontSize: 9 }}>
                      {new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </div>
                  </div>
                  <div style={{ flex: 1, paddingLeft: 14, borderLeft: '1px solid var(--line-soft)' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.4 }}>
                      {a.event}
                    </div>
                  </div>
                </div>
              ))}
              {recent_activity.length === 0 && (
                <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma atividade recente.</div>
              )}
            </div>
          </div>
        </div>

        {/* Metas financeiras */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Metas Financeiras</div>
              {financial_goals.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--text)', letterSpacing: '-0.015em' }}>
                    R$ {(financial_goals.reduce((s, g) => s + g.current_amount, 0) / 1000).toFixed(0)}k
                  </div>
                  <div className="mono muted" style={{ fontSize: 12 }}>
                    / {(financial_goals.reduce((s, g) => s + g.target_amount, 0) / 1000).toFixed(0)}k
                  </div>
                </div>
              )}
            </div>
            <button className="card-link">Ver todas <Icons.ChevronRight size={11} /></button>
          </div>
          {financial_goals.length === 0 ? (
            <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma meta cadastrada.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              {financial_goals.map(g => {
                const pct = Math.min(100, Math.round(g.progress_percent))
                const st  = STATUS_MAP[goalStatus(g)]
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: `color-mix(in oklab, var(--green) 16%, transparent)`, color: 'var(--green)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                        <GoalIcon category={g.category} size={13} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{g.name}</span>
                          {g.deadline && <span className="mono muted-2" style={{ fontSize: 11 }}>· {g.deadline}</span>}
                        </div>
                      </div>
                      <span className={`tag ${st.cls}`} style={{ fontSize: 10 }}><span className="dot" />{st.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 38 }}>
                      <div className="meter" style={{ flex: 1 }}><span style={{ width: `${pct}%` }} /></div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', minWidth: 100, textAlign: 'right' }}>
                        R$ {(g.current_amount / 1000).toFixed(0)}k <span style={{ color: 'var(--text-4)' }}>/ {(g.target_amount / 1000).toFixed(0)}k</span>
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--green)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Projetos + Leitura */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Projetos Ativos</div>
              <button className="card-link">Ver todos <Icons.ChevronRight size={11} /></button>
            </div>
            {projects.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum projeto ativo.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {projects.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="ring" style={{ '--p': p.progress_percent, '--size': '44px' } as React.CSSProperties}>
                      <span>{p.progress_percent}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="h-3">{p.title}</div>
                      {p.next_task && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{p.next_task}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.tasks_done}/{p.tasks_total} etapas</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Em leitura</div>
              <button className="card-link">Biblioteca <Icons.ChevronRight size={11} /></button>
            </div>
            {reading.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro em leitura.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reading.map(b => (
                  <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="ph" style={{ width: 38, height: 54, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="h-3" style={{ fontSize: 13.5 }}>{b.title}</div>
                      {b.author && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{b.author}</div>}
                      {b.total_pages && (
                        <div className="meter" style={{ marginTop: 8 }}>
                          <span style={{ width: `${b.progress_percent}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.progress_percent}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -30
```
Esperado: sem erros.

- [ ] **Step 3: Build**

```bash
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Pages/Dashboard/Index.tsx
git commit -m "feat: connect real data to Dashboard, replace hardcoded constants"
```
