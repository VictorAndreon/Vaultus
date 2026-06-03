# Conclusão de Tarefas Unificada + Barra de Progresso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar a barra de progresso dos cards de projeto ao percentual real de tarefas concluídas e unificar a definição de "tarefa concluída" com sincronia bidirecional entre o check-in (Tela de Tarefas) e a coluna "Concluído" do Kanban.

**Architecture:** Centralizar a regra de "concluída" em métodos de modelo (`ProjectColumn::nameIsDone`, `ProjectTask::isDone`, `Project::progressPercent`), expor `progress_percent`/`tasks_done`/`tasks_total` via `ProjectResource`, e tornar `toggleDone`/`move` do `ProjectTaskController` mantenedores da sincronia `completed_at` ↔ coluna. Frontend só consome `progress_percent`.

**Tech Stack:** Laravel 11 (Domain-Driven em `app/Domains`), Inertia + React 19 + TypeScript, PHPUnit com `RefreshDatabase`, tudo via Docker (`docker compose exec -T app ...`).

**Spec:** `docs/superpowers/specs/2026-06-03-project-task-completion-progress-design.md`

---

## Convenções deste plano

- **Todos os comandos rodam via Docker.** O container `app` precisa estar de pé:
  `docker compose up -d db redis app`
- Rodar um teste: `docker compose exec -T app php artisan test --filter <NomeDoTeste>`
- Modelos de teste são criados via `::create([...])` (NÃO há factories para Project/Column/Task).
- Commits **sem** `Co-Authored-By` (preferência do usuário).
- `User::factory()->create()` existe; usar `['timezone' => 'America/Sao_Paulo']` quando houver lógica de data.

## File Structure

**Backend (modify)**
- `src/app/Domains/Projects/Models/ProjectColumn.php` — helpers `nameIsDone`/`isDoneColumn`.
- `src/app/Domains/Projects/Models/ProjectTask.php` — `isDone()`.
- `src/app/Domains/Projects/Models/Project.php` — `tasksDoneCount()`, `progressPercent()`.
- `src/app/Http/Resources/ProjectResource.php` — expõe `progress_percent`/`tasks_done`/`tasks_total`.
- `src/app/Domains/Projects/Controllers/ProjectController.php` — eager-load `tasks.column` no index.
- `src/app/Domains/Projects/Controllers/ProjectTaskController.php` — `toggleDone` bidirecional, helper `placeTaskInColumn`, `resolveDoneColumn`, `move` sincroniza `completed_at`.
- `src/app/Domains/Dashboard/Services/DashboardAggregator.php` — usar `ProjectTask::isDone()`.
- `src/app/Domains/Tasks/Controllers/TasksController.php` — usar `ProjectTask::isDone()`.

**Backend (create — testes)**
- `src/tests/Feature/Projects/ProjectProgressTest.php` — modelos + prop do index.
- (append) `src/tests/Feature/Projects/ProjectTaskTest.php` — sincronia `toggleDone`/`move`.

**Frontend (modify)**
- `src/resources/js/types/index.d.ts` — campos no `interface Project`.
- `src/resources/js/Pages/Projects/components/ProjectCard.tsx` — largura da barra + rodapé.

---

## Task 1: `ProjectColumn` — helpers de "concluído"

**Files:**
- Modify: `src/app/Domains/Projects/Models/ProjectColumn.php`
- Test: `src/tests/Feature/Projects/ProjectProgressTest.php` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/tests/Feature/Projects/ProjectProgressTest.php`:

```php
<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_name_is_done_detects_done_columns(): void
    {
        $this->assertTrue(ProjectColumn::nameIsDone('Concluído'));
        $this->assertTrue(ProjectColumn::nameIsDone('concluida'));
        $this->assertTrue(ProjectColumn::nameIsDone('Done'));
        $this->assertTrue(ProjectColumn::nameIsDone('DONE — entregue'));
        $this->assertFalse(ProjectColumn::nameIsDone('A fazer'));
        $this->assertFalse(ProjectColumn::nameIsDone('Em progresso'));
        $this->assertFalse(ProjectColumn::nameIsDone(null));
    }
}
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_name_is_done_detects_done_columns`
Expected: FAIL — `Call to undefined method App\Domains\Projects\Models\ProjectColumn::nameIsDone()`

- [ ] **Step 3: Implementar os helpers**

Em `src/app/Domains/Projects/Models/ProjectColumn.php`, adicionar os dois métodos dentro da classe (após `tasks()`):

```php
    public static function nameIsDone(?string $name): bool
    {
        if ($name === null) {
            return false;
        }

        $lower = strtolower($name);

        return str_contains($lower, 'done') || str_contains($lower, 'conclu');
    }

    public function isDoneColumn(): bool
    {
        return self::nameIsDone($this->name);
    }
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter test_name_is_done_detects_done_columns`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Projects/Models/ProjectColumn.php src/tests/Feature/Projects/ProjectProgressTest.php
git commit -m "feat(projects): ProjectColumn::nameIsDone/isDoneColumn"
```

---

## Task 2: `ProjectTask::isDone()`

**Files:**
- Modify: `src/app/Domains/Projects/Models/ProjectTask.php`
- Test: `src/tests/Feature/Projects/ProjectProgressTest.php`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar este método à classe `ProjectProgressTest`:

```php
    public function test_task_is_done_by_completed_at_or_done_column(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $todo    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 0]);
        $done    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);

        $open = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'Aberta', 'position' => 0, 'priority' => 'low',
        ]);
        $byFlag = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'Flag', 'position' => 1, 'priority' => 'low', 'completed_at' => now(),
        ]);
        $byColumn = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'Coluna', 'position' => 0, 'priority' => 'low',
        ]);

        $this->assertFalse($open->isDone());
        $this->assertTrue($byFlag->isDone());
        $this->assertTrue($byColumn->isDone());
    }
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_task_is_done_by_completed_at_or_done_column`
Expected: FAIL — `Call to undefined method App\Domains\Projects\Models\ProjectTask::isDone()`

- [ ] **Step 3: Implementar `isDone()`**

Em `src/app/Domains/Projects/Models/ProjectTask.php`, adicionar dentro da classe (após `column()`):

```php
    public function isDone(): bool
    {
        return $this->completed_at !== null || ($this->column?->isDoneColumn() ?? false);
    }
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter test_task_is_done_by_completed_at_or_done_column`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Projects/Models/ProjectTask.php src/tests/Feature/Projects/ProjectProgressTest.php
git commit -m "feat(projects): ProjectTask::isDone (completed_at OU coluna concluída)"
```

---

## Task 3: `Project::progressPercent()` e `tasksDoneCount()`

**Files:**
- Modify: `src/app/Domains/Projects/Models/Project.php`
- Test: `src/tests/Feature/Projects/ProjectProgressTest.php`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar à classe `ProjectProgressTest`:

```php
    public function test_progress_percent_counts_done_over_total(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $todo    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 0]);
        $done    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);

        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $todo->id, 'title' => 't1', 'position' => 0, 'priority' => 'low']);
        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $todo->id, 'title' => 't2', 'position' => 1, 'priority' => 'low', 'completed_at' => now()]);
        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $done->id, 'title' => 't3', 'position' => 0, 'priority' => 'low']);
        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $todo->id, 'title' => 't4', 'position' => 2, 'priority' => 'low']);

        $project->load('tasks.column');

        $this->assertSame(2, $project->tasksDoneCount());
        $this->assertSame(50, $project->progressPercent());
    }

    public function test_progress_percent_is_zero_without_tasks(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $project->load('tasks.column');

        $this->assertSame(0, $project->progressPercent());
    }
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_progress_percent`
Expected: FAIL — `Call to undefined method ...Project::tasksDoneCount()`

- [ ] **Step 3: Implementar os métodos**

Em `src/app/Domains/Projects/Models/Project.php`, garantir o import no topo (logo após o `namespace`/`use` existentes):

```php
use App\Domains\Projects\Models\ProjectTask;
```

> Se o arquivo já estiver no namespace `App\Domains\Projects\Models`, o import é desnecessário — `ProjectTask` é resolvido no mesmo namespace. Nesse caso, pule o `use`.

Adicionar dentro da classe (após o método `tasks()`):

```php
    public function tasksDoneCount(): int
    {
        return $this->tasks->filter(fn (ProjectTask $t) => $t->isDone())->count();
    }

    public function progressPercent(): int
    {
        $total = $this->tasks->count();

        if ($total === 0) {
            return 0;
        }

        return (int) round($this->tasksDoneCount() / $total * 100);
    }
```

> Estes métodos operam sobre a relação `tasks` **já carregada** (com `column`). Sempre chamá-los após `load('tasks.column')` ou eager-load equivalente, para evitar N+1.

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter test_progress_percent`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Projects/Models/Project.php src/tests/Feature/Projects/ProjectProgressTest.php
git commit -m "feat(projects): Project::progressPercent/tasksDoneCount"
```

---

## Task 4: Expor progresso no `ProjectResource` + eager-load no index

**Files:**
- Modify: `src/app/Http/Resources/ProjectResource.php`
- Modify: `src/app/Domains/Projects/Controllers/ProjectController.php:18-21`
- Test: `src/tests/Feature/Projects/ProjectProgressTest.php`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar à classe `ProjectProgressTest`:

```php
    public function test_index_exposes_progress_percent(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $todo    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 0]);
        $done    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);

        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $todo->id, 'title' => 't1', 'position' => 0, 'priority' => 'low']);
        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $done->id, 'title' => 't2', 'position' => 0, 'priority' => 'low']);

        $this->actingAs($user)
            ->get('/projects')
            ->assertInertia(fn ($p) => $p
                ->component('Projects/Index')
                ->where('projects.data.0.progress_percent', 50)
                ->where('projects.data.0.tasks_done', 1)
                ->where('projects.data.0.tasks_total', 2)
            );
    }
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_index_exposes_progress_percent`
Expected: FAIL — propriedade `projects.data.0.progress_percent` não existe (valor null ≠ 50).

- [ ] **Step 3: Eager-load no controller**

Em `src/app/Domains/Projects/Controllers/ProjectController.php`, no método `index`, trocar a linha do eager-load:

De:
```php
                $user->projects()->withCount('tasks')->latest()->get()
```
Para:
```php
                $user->projects()->withCount('tasks')->with('tasks.column')->latest()->get()
```

- [ ] **Step 4: Expor no Resource**

Em `src/app/Http/Resources/ProjectResource.php`, dentro do array retornado por `toArray`, adicionar três entradas (logo após `'tasks_count' => $this->whenCounted('tasks'),`):

```php
            'tasks_total'      => $this->whenLoaded('tasks', fn () => $this->tasks->count()),
            'tasks_done'       => $this->whenLoaded('tasks', fn () => $this->tasksDoneCount()),
            'progress_percent' => $this->whenLoaded('tasks', fn () => $this->progressPercent()),
```

> `whenLoaded('tasks')` garante que esses campos só aparecem quando o controller carrega `tasks` (no index). No `show` (que carrega `columns.tasks`, não `tasks`) eles ficam ausentes — comportamento desejado, fora de escopo.

- [ ] **Step 5: Rodar o teste para confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter test_index_exposes_progress_percent`
Expected: PASS

- [ ] **Step 6: Rodar a suíte de Projects para garantir que nada quebrou**

Run: `docker compose exec -T app php artisan test tests/Feature/Projects`
Expected: PASS (incluindo `ProjectTest`, que ainda valida `->has('projects')`)

- [ ] **Step 7: Commit**

```bash
git add src/app/Http/Resources/ProjectResource.php src/app/Domains/Projects/Controllers/ProjectController.php src/tests/Feature/Projects/ProjectProgressTest.php
git commit -m "feat(projects): index expõe progress_percent/tasks_done/tasks_total"
```

---

## Task 5: Centralizar a regra em Dashboard e Tasks (refator sem mudança de comportamento)

**Files:**
- Modify: `src/app/Domains/Dashboard/Services/DashboardAggregator.php:13-18,108,122,126`
- Modify: `src/app/Domains/Tasks/Controllers/TasksController.php:31-35`

Esta task não muda comportamento — a cobertura existente (`DashboardTest`, `TasksTest`) é a rede de segurança.

- [ ] **Step 1: Rodar os testes existentes (devem passar antes do refator)**

Run: `docker compose exec -T app php artisan test tests/Feature/Dashboard tests/Feature/Tasks`
Expected: PASS

- [ ] **Step 2: Refatorar `TasksController`**

Em `src/app/Domains/Tasks/Controllers/TasksController.php`, substituir a closure `$isDone` (que hoje replica a regra inline):

De:
```php
        $isDone = fn($t) => $t->completed_at !== null || ($t->column && (
            str_contains(strtolower($t->column->name), 'done') ||
            str_contains(strtolower($t->column->name), 'conclu')
        ));
```
Para:
```php
        $isDone = fn ($t) => $t->isDone();
```

- [ ] **Step 3: Refatorar `DashboardAggregator`**

Em `src/app/Domains/Dashboard/Services/DashboardAggregator.php`:

(a) Onde aparece (no map de tasks, ~linha 108):
```php
                'is_done'      => $t->completed_at !== null || $this->isDoneColumn($t->column?->name),
```
Trocar por:
```php
                'is_done'      => $t->isDone(),
```

(b) Em `getActiveProjects` (~linhas 122 e 126), trocar:
```php
                $done   = $all->filter(fn($t) => $this->isDoneColumn($t->column?->name));
```
por
```php
                $done   = $all->filter(fn($t) => $t->isDone());
```
e
```php
                $next   = $all->first(fn($t) => ! $this->isDoneColumn($t->column?->name));
```
por
```php
                $next   = $all->first(fn($t) => ! $t->isDone());
```

(c) Remover o método privado agora não usado (linhas ~13-18):
```php
    private function isDoneColumn(?string $name): bool
    {
        if (! $name) return false;
        $lower = strtolower($name);
        return str_contains($lower, 'done') || str_contains($lower, 'conclu');
    }
```

> Verificar com `grep -n "isDoneColumn" src/app/Domains/Dashboard/Services/DashboardAggregator.php` que não há mais nenhuma referência antes de remover.

- [ ] **Step 4: Rodar os testes novamente (continuam verdes)**

Run: `docker compose exec -T app php artisan test tests/Feature/Dashboard tests/Feature/Tasks`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Dashboard/Services/DashboardAggregator.php src/app/Domains/Tasks/Controllers/TasksController.php
git commit -m "refactor(projects): Dashboard e Tasks usam ProjectTask::isDone"
```

---

## Task 6: Check-in bidirecional — `toggleDone` + helpers

**Files:**
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php` (imports, `toggleDone`, novos `placeTaskInColumn`/`resolveDoneColumn`)
- Test: `src/tests/Feature/Projects/ProjectTaskTest.php` (append)

- [ ] **Step 1: Escrever os testes que falham**

Adicionar estes métodos à classe `ProjectTaskTest` em `src/tests/Feature/Projects/ProjectTaskTest.php`:

```php
    public function test_checkin_marks_completed_and_moves_to_done_column(): void
    {
        $user    = User::factory()->create();
        [$project, $todo] = $this->makeProjectWithColumn($user);
        $done = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/toggle-done")
            ->assertRedirect();

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertSame($done->id, $task->project_column_id);
    }

    public function test_checkin_creates_done_column_when_missing(): void
    {
        $user    = User::factory()->create();
        [$project, $todo] = $this->makeProjectWithColumn($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/toggle-done")
            ->assertRedirect();

        $this->assertDatabaseHas('project_columns', [
            'project_id' => $project->id,
            'name'       => 'Concluído',
        ]);

        $task->refresh();
        $created = ProjectColumn::where('project_id', $project->id)->where('name', 'Concluído')->first();
        $this->assertSame($created->id, $task->project_column_id);
        $this->assertNotNull($task->completed_at);
    }

    public function test_uncheck_clears_completed_and_moves_out_of_done(): void
    {
        $user    = User::factory()->create();
        [$project, $todo] = $this->makeProjectWithColumn($user); // 'Todo' position 0
        $progress = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Em progresso', 'position' => 1]);
        $done     = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 2]);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low', 'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/toggle-done")
            ->assertRedirect();

        $task->refresh();
        $this->assertNull($task->completed_at);
        $this->assertSame($progress->id, $task->project_column_id); // última coluna não-concluída
    }
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `docker compose exec -T app php artisan test --filter "test_checkin_marks_completed_and_moves_to_done_column|test_checkin_creates_done_column_when_missing|test_uncheck_clears_completed_and_moves_out_of_done"`
Expected: FAIL — `toggleDone` atual só alterna `completed_at` (não move; não cria coluna) e retorna 204 (sem redirect).

- [ ] **Step 3: Adicionar import do `ProjectColumn`**

Em `src/app/Domains/Projects/Controllers/ProjectTaskController.php`, adicionar ao bloco de `use` (após `use App\Domains\Projects\Models\ProjectTask;`):

```php
use App\Domains\Projects\Models\ProjectColumn;
```

- [ ] **Step 4: Substituir o método `toggleDone`**

Trocar o método `toggleDone` inteiro por:

```php
    public function toggleDone(Request $request, ProjectTask $task): \Illuminate\Http\RedirectResponse
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        DB::transaction(function () use ($task) {
            if ($task->completed_at === null) {
                $task->update(['completed_at' => now()]);
                $doneColumn = $this->resolveDoneColumn($task->project);
                $this->placeTaskInColumn($task, $doneColumn->id);
            } else {
                $task->update(['completed_at' => null]);

                if ($task->column && $task->column->isDoneColumn()) {
                    $target = $task->project->columns()
                        ->get()
                        ->filter(fn (ProjectColumn $c) => ! $c->isDoneColumn())
                        ->sortByDesc('position')
                        ->first();

                    if ($target) {
                        $this->placeTaskInColumn($task, $target->id);
                    }
                }
            }
        });

        return back();
    }

    /**
     * Coluna "Concluído" do projeto (a primeira por posição). Cria uma se não existir.
     */
    private function resolveDoneColumn(Project $project): ProjectColumn
    {
        $existing = $project->columns()->get()->first(fn (ProjectColumn $c) => $c->isDoneColumn());

        if ($existing) {
            return $existing;
        }

        return $project->columns()->create([
            'name'     => 'Concluído',
            'position' => $project->columns()->count(),
        ]);
    }

    /**
     * Move a tarefa para a coluna informada e renormaliza as posições dos irmãos.
     * $position = null → append no fim da coluna.
     */
    private function placeTaskInColumn(ProjectTask $task, int $columnId, ?int $position = null): void
    {
        $task->update(['project_column_id' => $columnId]);

        $siblings = ProjectTask::where('project_column_id', $columnId)
            ->where('id', '!=', $task->id)
            ->orderBy('position')
            ->get();

        $insertAt = $position ?? $siblings->count();
        $siblings->splice($insertAt, 0, [$task]);

        foreach ($siblings as $i => $t) {
            $t->update(['position' => $i]);
        }
    }
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter "test_checkin_marks_completed_and_moves_to_done_column|test_checkin_creates_done_column_when_missing|test_uncheck_clears_completed_and_moves_out_of_done"`
Expected: PASS (3 testes)

- [ ] **Step 6: Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectTaskController.php src/tests/Feature/Projects/ProjectTaskTest.php
git commit -m "feat(projects): check-in marca/desmarca e sincroniza coluna Concluído"
```

---

## Task 7: Sincronia ao arrastar — `move` ajusta `completed_at`

**Files:**
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php` (método `move`)
- Test: `src/tests/Feature/Projects/ProjectTaskTest.php` (append)

- [ ] **Step 1: Escrever os testes que falham**

Adicionar à classe `ProjectTaskTest`:

```php
    public function test_move_into_done_column_sets_completed_at(): void
    {
        $user    = User::factory()->create();
        [$project, $todo] = $this->makeProjectWithColumn($user);
        $done = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $done->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        $task->refresh();
        $this->assertSame($done->id, $task->project_column_id);
        $this->assertNotNull($task->completed_at);
    }

    public function test_move_out_of_done_column_clears_completed_at(): void
    {
        $user    = User::factory()->create();
        [$project, $todo] = $this->makeProjectWithColumn($user);
        $done = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low', 'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $todo->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        $task->refresh();
        $this->assertSame($todo->id, $task->project_column_id);
        $this->assertNull($task->completed_at);
    }
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `docker compose exec -T app php artisan test --filter "test_move_into_done_column_sets_completed_at|test_move_out_of_done_column_clears_completed_at"`
Expected: FAIL — `move` atual não toca em `completed_at`.

- [ ] **Step 3: Substituir o método `move`**

Trocar o método `move` inteiro por (reaproveita `placeTaskInColumn` da Task 6):

```php
    public function move(Request $request, ProjectTask $task)
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'project_column_id' => 'required|integer|exists:project_columns,id',
            'position'          => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($task, $validated) {
            $this->placeTaskInColumn($task, $validated['project_column_id'], $validated['position']);

            $destColumn = ProjectColumn::find($validated['project_column_id']);
            $destIsDone = $destColumn?->isDoneColumn() ?? false;

            if ($destIsDone && $task->completed_at === null) {
                $task->update(['completed_at' => now()]);
            } elseif (! $destIsDone && $task->completed_at !== null) {
                $task->update(['completed_at' => null]);
            }
        });

        return back();
    }
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter "test_move_into_done_column_sets_completed_at|test_move_out_of_done_column_clears_completed_at"`
Expected: PASS (2 testes)

- [ ] **Step 5: Rodar a suíte de Projects inteira (regressão)**

Run: `docker compose exec -T app php artisan test tests/Feature/Projects`
Expected: PASS — incluindo `test_can_move_task_to_another_column` (mover p/ coluna "Done" agora também seta `completed_at`, mas esse teste só verifica coluna/posição, então continua verde).

- [ ] **Step 6: Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectTaskController.php src/tests/Feature/Projects/ProjectTaskTest.php
git commit -m "feat(projects): arrastar para/da coluna Concluído sincroniza completed_at"
```

---

## Task 8: Frontend — barra de progresso no card + tipos

**Files:**
- Modify: `src/resources/js/types/index.d.ts` (`interface Project`)
- Modify: `src/resources/js/Pages/Projects/components/ProjectCard.tsx`

Sem teste automatizado (não há suíte de frontend). Verificação via `tsc` + checagem visual.

- [ ] **Step 1: Adicionar os campos ao tipo `Project`**

Em `src/resources/js/types/index.d.ts`, no `interface Project`, adicionar (após `tasks_count?: number`):

```ts
    progress_percent?: number
    tasks_done?: number
    tasks_total?: number
```

- [ ] **Step 2: Ligar a barra ao progresso**

Em `src/resources/js/Pages/Projects/components/ProjectCard.tsx`, na barra `.meter`, trocar o `width` fixo:

De:
```tsx
            <div className="meter" style={{ margin: '16px 0 14px' }}>
                <span style={{ width: '0%' }} />
            </div>
```
Para:
```tsx
            <div className="meter" style={{ margin: '16px 0 14px' }}>
                <span style={{ width: `${project.progress_percent ?? 0}%` }} />
            </div>
```

> O arquivo pode ter sido reformatado pelo linter (aspas duplas/multilinha). Localizar o `<span style={{ width: ... }} />` dentro do `<div className="meter">` e aplicar o `width` dinâmico, preservando o estilo de formatação atual do arquivo.

- [ ] **Step 3: Mostrar `tasks_done/tasks_total` no rodapé**

No mesmo arquivo, no rodapé, trocar o bloco que mostra a contagem de tarefas:

De (equivalente; pode variar pela formatação):
```tsx
                {project.tasks_count !== undefined && (
                    <span>
                        <span className="mono" style={{ color: 'var(--text-2)' }}>{project.tasks_count}</span> tarefas
                    </span>
                )}
```
Para:
```tsx
                {project.tasks_total !== undefined && (
                    <span>
                        <span className="mono" style={{ color: 'var(--text-2)' }}>{project.tasks_done ?? 0}/{project.tasks_total}</span> tarefas
                    </span>
                )}
```

- [ ] **Step 4: Type-check do frontend**

Run: `docker compose --profile dev run --rm node sh -c "npx tsc --noEmit -p tsconfig.json --ignoreDeprecations 6.0" 2>&1 | grep -iE "ProjectCard|types/index" || echo "OK: sem erros nos arquivos tocados"`
Expected: `OK: sem erros nos arquivos tocados` (erros pré-existentes em OUTROS arquivos — Journal/Reviews/app.tsx/idempotentPost — são esperados e ignorados).

- [ ] **Step 5: Commit**

```bash
git add src/resources/js/types/index.d.ts src/resources/js/Pages/Projects/components/ProjectCard.tsx
git commit -m "feat(projects): barra do card reflete progress_percent e mostra concluídas/total"
```

---

## Verificação final

- [ ] **Suíte completa de backend afetada**

Run: `docker compose exec -T app php artisan test tests/Feature/Projects tests/Feature/Tasks tests/Feature/Dashboard`
Expected: PASS (todos)

- [ ] **Checagem visual (opcional, com Vite de pé)**

`docker compose --profile dev up node -d` → abrir `https://vaultus.local/projects`:
- A barra do card reflete o % de tarefas concluídas.
- Concluir uma tarefa em `/tasks` move o card para "Concluídas hoje" e, ao abrir o projeto, ela está na coluna "Concluído".
- Arrastar no Kanban para/da coluna "Concluído" reflete na barra ao voltar para a lista.

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura da spec:**
- §1 Centralizar lógica → Tasks 1, 2, 5. ✓
- §2 Progresso (modelo + resource + controller + frontend + tipos) → Tasks 3, 4, 8. ✓
- §3 Check-in bidirecional + auto-criar coluna + helper → Task 6. ✓
- §4 Sincronia ao arrastar → Task 7. ✓
- §5 Testes → presentes em cada task + verificação final. ✓

**Consistência de tipos/assinaturas:**
- `ProjectColumn::nameIsDone(?string): bool`, `ProjectColumn::isDoneColumn(): bool` — usados em Tasks 2, 5, 6, 7. ✓
- `ProjectTask::isDone(): bool` — Tasks 2, 3, 5. ✓
- `Project::tasksDoneCount(): int`, `progressPercent(): int` — Tasks 3, 4. ✓
- `placeTaskInColumn(ProjectTask, int, ?int): void` definido na Task 6, reutilizado na Task 7. ✓
- Props frontend `progress_percent`/`tasks_done`/`tasks_total` — definidas no resource (Task 4), tipadas e consumidas (Task 8). ✓

**Bordas cobertas:** sem coluna "Concluído" (cria — Task 6), desmarcar volta p/ última não-concluída (Task 6), 0 tarefas → 0% (Task 3).
