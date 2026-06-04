# Tasks: Inbox/Triagem + aba Por Projeto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar semântica real ao Inbox da tela de Tarefas (captura rápida → triagem) e adicionar uma aba "Por Projeto" com filtro multi-projeto, resolvendo os bugs de "Processar" e "status não remove da inbox".

**Architecture:** Um marcador explícito `project_tasks.triaged_at` define o Inbox (`triaged_at IS NULL && !isDone()`). Vários gatilhos setam o marcador (criação completa, captura+processar, sair da 1ª coluna, concluir). A aba "Por Projeto" é uma visão somente-leitura que renderiza as colunas reais de cada projeto selecionado.

**Tech Stack:** Laravel 11 (Domains), Inertia.js, React 19 + TypeScript, PHPUnit (RefreshDatabase, sem factories p/ Project/Column/Task), Docker.

**Spec:** `docs/superpowers/specs/2026-06-03-tasks-inbox-triage-design.md`

**Convenções deste plano:**
- Todo comando roda via Docker: `docker compose exec -T app php artisan ...`.
- Type-check: `docker compose --profile dev run --rm node sh -c "npx tsc --noEmit -p tsconfig.json --ignoreDeprecations 6.0"`.
- Commits **sem** `Co-Authored-By`.
- Inbox ⟺ `triaged_at IS NULL` **E** `!isDone()`. `isDone()` já existe.

---

## File Structure

**Backend (modificar):**
- `src/database/migrations/2026_06_03_000001_add_triaged_at_to_project_tasks.php` — criar.
- `src/app/Domains/Projects/Models/ProjectTask.php` — `triaged_at` fillable/cast + `isTriaged()`.
- `src/app/Domains/Projects/Controllers/ProjectTaskController.php` — `store` triagia; novos `capture`, `triage`; `move` e `toggleDone` com auto-triage.
- `src/app/Domains/Tasks/Controllers/TasksController.php` — Inbox por não-triadas + `projects_board`.
- `src/routes/web.php` — rotas `capture` e `triage`.

**Frontend (modificar/criar):**
- `src/resources/js/Pages/Tasks/Index.tsx` — orquestrador de abas.
- `src/resources/js/Pages/Tasks/components/TaskListView.tsx` — criar (lista atual + stats + aside).
- `src/resources/js/Pages/Tasks/components/InboxPanel.tsx` — criar (captura rápida + lista + Processar).
- `src/resources/js/Pages/Tasks/components/TriageModal.tsx` — criar.
- `src/resources/js/Pages/Tasks/components/ProjectBoardView.tsx` — criar (aba Por Projeto).

**Testes (criar):**
- `src/tests/Feature/Tasks/TaskInboxTest.php` — Parte A.
- `src/tests/Feature/Tasks/ProjectBoardTest.php` — Parte B.

---

# PARTE A — Inbox / Triagem

## Task 1: Migração `triaged_at` + `ProjectTask::isTriaged()`

**Files:**
- Create: `src/database/migrations/2026_06_03_000001_add_triaged_at_to_project_tasks.php`
- Modify: `src/app/Domains/Projects/Models/ProjectTask.php`
- Create: `src/tests/Feature/Tasks/TaskInboxTest.php`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/tests/Feature/Tasks/TaskInboxTest.php` (este arquivo recebe os testes das Tasks 1–7; o helper `makeProject` é reusado por todas):

```php
<?php

namespace Tests\Feature\Tasks;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskInboxTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Project, 1: ProjectColumn, 2: ProjectColumn}
     * Projeto com duas colunas: 'A Fazer' (pos 0) e 'Em progresso' (pos 1).
     */
    private function makeProject(User $user): array
    {
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $first   = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A Fazer', 'position' => 0]);
        $second  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Em progresso', 'position' => 1]);
        return [$project, $first, $second];
    }

    public function test_is_triaged_reflects_triaged_at(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->assertFalse($task->isTriaged());

        $task->update(['triaged_at' => now()]);
        $this->assertTrue($task->fresh()->isTriaged());
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_is_triaged_reflects_triaged_at`
Expected: FAIL — coluna `triaged_at` e método `isTriaged()` não existem.

- [ ] **Step 3: Criar a migração**

Criar `src/database/migrations/2026_06_03_000001_add_triaged_at_to_project_tasks.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->timestamp('triaged_at')->nullable()->after('completed_at');
        });

        // Backfill: tarefas existentes nascem triadas para o Inbox começar vazio.
        DB::table('project_tasks')->update([
            'triaged_at' => DB::raw('COALESCE(completed_at, created_at)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropColumn('triaged_at');
        });
    }
};
```

- [ ] **Step 4: Atualizar o model**

Em `src/app/Domains/Projects/Models/ProjectTask.php`:

Trocar a linha `$fillable`:
```php
    protected $fillable = ['project_id', 'project_column_id', 'title', 'description', 'priority', 'tag', 'position', 'due_at', 'completed_at', 'triaged_at'];
```

Trocar o método `casts()`:
```php
    protected function casts(): array
    {
        return [
            'due_at'       => 'datetime',
            'completed_at' => 'datetime',
            'triaged_at'   => 'datetime',
        ];
    }
```

Adicionar o método (após `isDone()`):
```php
    public function isTriaged(): bool
    {
        return $this->triaged_at !== null;
    }
```

- [ ] **Step 5: Rodar a migração e o teste**

Run: `docker compose exec -T app php artisan migrate`
Then: `docker compose exec -T app php artisan test --filter test_is_triaged_reflects_triaged_at`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/database/migrations/2026_06_03_000001_add_triaged_at_to_project_tasks.php src/app/Domains/Projects/Models/ProjectTask.php src/tests/Feature/Tasks/TaskInboxTest.php
git commit -m "feat(tasks): coluna triaged_at + ProjectTask::isTriaged"
```

---

## Task 2: Criação completa (`store`) marca a tarefa como triada

**Files:**
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php` (método `store`)
- Test: `src/tests/Feature/Tasks/TaskInboxTest.php` (append)

- [ ] **Step 1: Escrever o teste que falha**

Adicionar à classe `TaskInboxTest`:

```php
    public function test_full_create_marks_task_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/tasks", [
                'title'             => 'Detalhada',
                'project_column_id' => $first->id,
                'priority'          => 'high',
            ])
            ->assertRedirect();

        $task = ProjectTask::where('title', 'Detalhada')->first();
        $this->assertNotNull($task);
        $this->assertNotNull($task->triaged_at);
    }
```

- [ ] **Step 2: Confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_full_create_marks_task_triaged`
Expected: FAIL — `triaged_at` fica null na criação atual.

- [ ] **Step 3: Atualizar `store`**

Em `src/app/Domains/Projects/Controllers/ProjectTaskController.php`, no método `store`, logo antes de `$project->tasks()->create($validated);`, adicionar:

```php
        $validated['triaged_at'] = now();
```

Contexto (o trecho fica assim):
```php
        $validated['position'] = $maxPos + 1;
        $validated['priority'] ??= 'medium';
        $validated['triaged_at'] = now();

        $project->tasks()->create($validated);
```

- [ ] **Step 4: Confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter test_full_create_marks_task_triaged`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectTaskController.php src/tests/Feature/Tasks/TaskInboxTest.php
git commit -m "feat(tasks): criar tarefa pelo modal completo já marca triada"
```

---

## Task 3: Captura rápida (`capture`) cria tarefa não-triada na 1ª coluna

**Files:**
- Modify: `src/routes/web.php`
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php` (novo método `capture`)
- Test: `src/tests/Feature/Tasks/TaskInboxTest.php` (append)

- [ ] **Step 1: Escrever os testes que falham**

Adicionar à classe `TaskInboxTest`:

```php
    public function test_quick_capture_creates_untriaged_task_in_first_column(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);

        $this->actingAs($user)
            ->post('/tasks/capture', ['title' => 'Capturada', 'project_id' => $project->id])
            ->assertRedirect();

        $task = ProjectTask::where('title', 'Capturada')->first();
        $this->assertNotNull($task);
        $this->assertNull($task->triaged_at);
        $this->assertSame($first->id, $task->project_column_id);
        $this->assertSame('medium', $task->priority);
    }

    public function test_cannot_capture_into_other_users_project(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        [$project] = $this->makeProject($owner);

        $this->actingAs($other)
            ->post('/tasks/capture', ['title' => 'X', 'project_id' => $project->id])
            ->assertNotFound();
    }
```

- [ ] **Step 2: Confirmar que falham**

Run: `docker compose exec -T app php artisan test --filter "test_quick_capture_creates_untriaged_task_in_first_column|test_cannot_capture_into_other_users_project"`
Expected: FAIL — rota `/tasks/capture` não existe (404 em ambos por motivos diferentes).

- [ ] **Step 3: Adicionar a rota**

Em `src/routes/web.php`, imediatamente **antes** de `Route::get('/tasks', [TasksController::class, 'index'])->name('tasks');`, adicionar:

```php
    Route::post('/tasks/capture', [ProjectTaskController::class, 'capture']);
```

- [ ] **Step 4: Implementar `capture`**

Em `src/app/Domains/Projects/Controllers/ProjectTaskController.php`, adicionar o método (após `store`):

```php
    public function capture(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'title'      => 'required|string|max:255',
            'project_id' => 'required|integer',
        ]);

        $project = Project::where('id', $validated['project_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $firstColumn = $project->columns()->orderBy('position')->first();
        abort_if($firstColumn === null, 422, 'Projeto sem colunas.');

        $maxPos = $project->tasks()
            ->where('project_column_id', $firstColumn->id)
            ->max('position') ?? -1;

        $project->tasks()->create([
            'project_column_id' => $firstColumn->id,
            'title'             => $validated['title'],
            'priority'          => 'medium',
            'position'          => $maxPos + 1,
            'triaged_at'        => null,
        ]);

        return back();
    }
```

- [ ] **Step 5: Confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter "test_quick_capture_creates_untriaged_task_in_first_column|test_cannot_capture_into_other_users_project"`
Expected: PASS (2).

- [ ] **Step 6: Commit**

```bash
git add src/routes/web.php src/app/Domains/Projects/Controllers/ProjectTaskController.php src/tests/Feature/Tasks/TaskInboxTest.php
git commit -m "feat(tasks): captura rápida cria tarefa não-triada na 1ª coluna"
```

---

## Task 4: Processar (`triage`) — define prazo/prioridade/coluna e marca triada

**Files:**
- Modify: `src/routes/web.php`
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php` (novo método `triage`)
- Test: `src/tests/Feature/Tasks/TaskInboxTest.php` (append)

- [ ] **Step 1: Escrever os testes que falham**

Adicionar à classe `TaskInboxTest`:

```php
    public function test_triage_sets_triaged_at_and_applies_fields(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/triage", [
                'due_at'            => '2026-06-10',
                'priority'          => 'high',
                'project_column_id' => $second->id,
            ])
            ->assertRedirect();

        $task->refresh();
        $this->assertNotNull($task->triaged_at);
        $this->assertSame('high', $task->priority);
        $this->assertNotNull($task->due_at);
        $this->assertSame($second->id, $task->project_column_id);
    }

    public function test_triage_rejects_column_from_other_project(): void
    {
        $user = User::factory()->create();
        [$projectA, $firstA] = $this->makeProject($user);
        $projectB = Project::create(['user_id' => $user->id, 'title' => 'B', 'status' => 'active']);
        $columnB  = ProjectColumn::create(['project_id' => $projectB->id, 'name' => 'Todo B', 'position' => 0]);
        $task = ProjectTask::create([
            'project_id' => $projectA->id, 'project_column_id' => $firstA->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/triage", ['project_column_id' => $columnB->id])
            ->assertSessionHasErrors('project_column_id');

        $this->assertNull($task->fresh()->triaged_at);
    }

    public function test_cannot_triage_other_users_task(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        [$project, $first] = $this->makeProject($owner);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($other)
            ->patch("/projects/tasks/{$task->id}/triage", ['priority' => 'high'])
            ->assertForbidden();
    }
```

- [ ] **Step 2: Confirmar que falham**

Run: `docker compose exec -T app php artisan test --filter "test_triage_sets_triaged_at_and_applies_fields|test_triage_rejects_column_from_other_project|test_cannot_triage_other_users_task"`
Expected: FAIL — rota/método `triage` não existem.

- [ ] **Step 3: Adicionar a rota**

Em `src/routes/web.php`, no bloco `// Project Tasks`, logo após a linha do `move`, adicionar:

```php
    Route::patch('/projects/tasks/{task}/triage', [ProjectTaskController::class, 'triage']);
```

- [ ] **Step 4: Implementar `triage`**

Em `src/app/Domains/Projects/Controllers/ProjectTaskController.php`, adicionar o método (após `toggleDone`):

```php
    public function triage(Request $request, ProjectTask $task): \Illuminate\Http\RedirectResponse
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'due_at'            => 'nullable|date',
            'priority'          => 'sometimes|in:low,medium,high,urgent',
            'project_column_id' => ['sometimes', 'integer', Rule::exists('project_columns', 'id')->where('project_id', $task->project_id)],
        ]);

        DB::transaction(function () use ($task, $validated) {
            if (array_key_exists('due_at', $validated)) {
                $task->update(['due_at' => $validated['due_at']]);
            }
            if (array_key_exists('priority', $validated)) {
                $task->update(['priority' => $validated['priority']]);
            }
            if (array_key_exists('project_column_id', $validated)
                && $validated['project_column_id'] !== $task->project_column_id) {
                $this->placeTaskInColumn($task, $validated['project_column_id']);
            }
            if ($task->triaged_at === null) {
                $task->update(['triaged_at' => now()]);
            }
        });

        return back();
    }
```

- [ ] **Step 5: Confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter "test_triage_sets_triaged_at_and_applies_fields|test_triage_rejects_column_from_other_project|test_cannot_triage_other_users_task"`
Expected: PASS (3).

- [ ] **Step 6: Commit**

```bash
git add src/routes/web.php src/app/Domains/Projects/Controllers/ProjectTaskController.php src/tests/Feature/Tasks/TaskInboxTest.php
git commit -m "feat(tasks): processar define prazo/prioridade/coluna e marca triada"
```

---

## Task 5: Arrastar para fora da 1ª coluna auto-triagia (`move`)

**Files:**
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php` (método `move`)
- Test: `src/tests/Feature/Tasks/TaskInboxTest.php` (append)

- [ ] **Step 1: Escrever os testes que falham**

Adicionar à classe `TaskInboxTest`:

```php
    public function test_move_out_of_first_column_marks_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $second->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        $this->assertNotNull($task->fresh()->triaged_at);
    }

    public function test_move_back_to_first_column_keeps_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $second->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low', 'triaged_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $first->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        // Uma vez triada, sempre triada — mover de volta não desfaz.
        $this->assertNotNull($task->fresh()->triaged_at);
    }
```

- [ ] **Step 2: Confirmar que `test_move_out_of_first_column_marks_triaged` falha**

Run: `docker compose exec -T app php artisan test --filter "test_move_out_of_first_column_marks_triaged|test_move_back_to_first_column_keeps_triaged"`
Expected: `test_move_out_of_first_column_marks_triaged` FAIL (move atual não toca em `triaged_at`); `test_move_back_to_first_column_keeps_triaged` já passa (não desfaz nada hoje). Confirme que pelo menos o primeiro falha.

- [ ] **Step 3: Atualizar `move`**

Em `src/app/Domains/Projects/Controllers/ProjectTaskController.php`, dentro da `DB::transaction` do método `move`, **após** o bloco que ajusta `completed_at`, adicionar:

```php
            // Auto-triagem: sair da 1ª coluna marca como triada (set-once).
            $firstColumnId = $task->project->columns()->orderBy('position')->value('id');
            if ($task->triaged_at === null && $validated['project_column_id'] !== $firstColumnId) {
                $task->update(['triaged_at' => now()]);
            }
```

A transação completa do `move` fica:
```php
        DB::transaction(function () use ($task, $validated) {
            $this->placeTaskInColumn($task, $validated['project_column_id'], $validated['position']);

            $destColumn = ProjectColumn::find($validated['project_column_id']);
            $destIsDone = $destColumn?->isDoneColumn() ?? false;

            if ($destIsDone && $task->completed_at === null) {
                $task->update(['completed_at' => now()]);
            } elseif (! $destIsDone && $task->completed_at !== null) {
                $task->update(['completed_at' => null]);
            }

            // Auto-triagem: sair da 1ª coluna marca como triada (set-once).
            $firstColumnId = $task->project->columns()->orderBy('position')->value('id');
            if ($task->triaged_at === null && $validated['project_column_id'] !== $firstColumnId) {
                $task->update(['triaged_at' => now()]);
            }
        });
```

- [ ] **Step 4: Confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter "test_move_out_of_first_column_marks_triaged|test_move_back_to_first_column_keeps_triaged"`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectTaskController.php src/tests/Feature/Tasks/TaskInboxTest.php
git commit -m "feat(tasks): arrastar para fora da 1ª coluna marca triada"
```

---

## Task 6: Concluir uma tarefa também a triagia (`toggleDone`)

**Files:**
- Modify: `src/app/Domains/Projects/Controllers/ProjectTaskController.php` (método `toggleDone`)
- Test: `src/tests/Feature/Tasks/TaskInboxTest.php` (append)

- [ ] **Step 1: Escrever o teste que falha**

Adicionar à classe `TaskInboxTest`:

```php
    public function test_completing_task_marks_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/toggle-done")
            ->assertRedirect();

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertNotNull($task->triaged_at);
    }
```

- [ ] **Step 2: Confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_completing_task_marks_triaged`
Expected: FAIL — `triaged_at` permanece null ao concluir.

- [ ] **Step 3: Atualizar `toggleDone`**

Em `src/app/Domains/Projects/Controllers/ProjectTaskController.php`, no método `toggleDone`, dentro do ramo `if ($task->completed_at === null) {`, logo após `$task->update(['completed_at' => now()]);`, adicionar:

```php
                if ($task->triaged_at === null) {
                    $task->update(['triaged_at' => now()]);
                }
```

O ramo fica:
```php
            if ($task->completed_at === null) {
                $task->update(['completed_at' => now()]);
                if ($task->triaged_at === null) {
                    $task->update(['triaged_at' => now()]);
                }
                $doneColumn = $this->resolveDoneColumn($task->project);
                $this->placeTaskInColumn($task, $doneColumn->id);
            } else {
```

- [ ] **Step 4: Confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter test_completing_task_marks_triaged`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectTaskController.php src/tests/Feature/Tasks/TaskInboxTest.php
git commit -m "feat(tasks): concluir tarefa também a marca triada"
```

---

## Task 7: `TasksController@index` expõe o Inbox por não-triadas

**Files:**
- Modify: `src/app/Domains/Tasks/Controllers/TasksController.php` (método `index`)
- Test: `src/tests/Feature/Tasks/TaskInboxTest.php` (append)

- [ ] **Step 1: Escrever o teste que falha**

Adicionar à classe `TaskInboxTest`:

```php
    public function test_index_inbox_lists_only_untriaged_not_done(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);
        $done = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 2]);

        // (a) não-triada e não-concluída → ENTRA no Inbox
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'Na inbox', 'position' => 0, 'priority' => 'low',
        ]);
        // (b) triada → fora
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'Triada', 'position' => 1, 'priority' => 'low', 'triaged_at' => now(),
        ]);
        // (c) não-triada porém na coluna "Concluído" (isDone) → fora
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'Concluída', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn ($page) => $page
                ->component('Tasks/Index')
                ->where('inbox_count', 1)
                ->where('inbox.0.title', 'Na inbox')
            );
    }
```

- [ ] **Step 2: Confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter test_index_inbox_lists_only_untriaged_not_done`
Expected: FAIL — props `inbox`/`inbox_count` não existem.

- [ ] **Step 3: Atualizar `index`**

Em `src/app/Domains/Tasks/Controllers/TasksController.php`, dentro de `index`, logo após a linha que define `$noDue` (`$noDue = $allTasks->filter(...)`), adicionar:

```php
        $inbox = $allTasks->filter(fn ($t) => $t->triaged_at === null && ! $isDone($t));
```

E no array do `Inertia::render('Tasks/Index', [...])`, adicionar (pode trocar o bloco `no_due_tasks`):

```php
            'inbox' => $inbox->map(fn ($t) => [
                'id'           => $t->id,
                'title'        => $t->title,
                'project_id'   => $t->project_id,
                'project_name' => $t->project->title,
                'priority'     => $t->priority,
            ])->values()->toArray(),
            'inbox_count' => $inbox->count(),
```

> Manter `no_due_tasks`/`stats.no_due` como estão (a stat "Sem prazo" continua existindo). O card Inbox passará a usar `inbox`/`inbox_count` na Task 8.

- [ ] **Step 4: Confirmar que passa + regressão**

Run: `docker compose exec -T app php artisan test tests/Feature/Tasks`
Expected: PASS (todos, incluindo os antigos de `TasksTest`).

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Tasks/Controllers/TasksController.php src/tests/Feature/Tasks/TaskInboxTest.php
git commit -m "feat(tasks): index expõe inbox (não-triadas) e inbox_count"
```

---

## Task 8: Frontend Parte A — abas, captura rápida, Processar

**Files:**
- Modify: `src/resources/js/Pages/Tasks/Index.tsx`
- Create: `src/resources/js/Pages/Tasks/components/TaskListView.tsx`
- Create: `src/resources/js/Pages/Tasks/components/InboxPanel.tsx`
- Create: `src/resources/js/Pages/Tasks/components/TriageModal.tsx`

Sem teste automatizado — verificação por `tsc` + checagem visual.

- [ ] **Step 1: Extrair a visão de lista para `TaskListView.tsx`**

Criar `src/resources/js/Pages/Tasks/components/TaskListView.tsx` movendo para cá o conteúdo de lista+stats+aside que hoje está em `Index.tsx`. O componente recebe as props já existentes e renderiza a coluna principal (grupos de tarefas) e o `<aside>`. Trocar, no aside, o card "Inbox" pelo `<InboxPanel>`.

```tsx
import { router } from '@inertiajs/react'
import { useState } from 'react'
import { Icons } from '@/Components/Icons'
import Sparkline from '@/Components/charts/Sparkline'
import InboxPanel from './InboxPanel'
import type { ProjectOption } from './TriageModal'

export interface Task {
    id: number
    title: string
    project_name: string
    priority: 'high' | 'medium' | 'low' | null
    due_at: string | null
    due_date: string | null
    is_done: boolean
    group: 'today' | 'week' | 'later' | 'done_today'
    tag: string | null
}

export interface InboxItem {
    id: number
    title: string
    project_id: number
    project_name: string
    priority: 'high' | 'medium' | 'low' | null
}

interface Props {
    tasks: Task[]
    stats: { today: number; overdue: number; this_week: number; no_due: number }
    by_project: Array<{ project_name: string; count: number }>
    projects: ProjectOption[]
    inbox: InboxItem[]
    inbox_count: number
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

export default function TaskListView({ tasks, stats, by_project, projects, inbox, inbox_count }: Props) {
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

    const groups = GROUP_ORDER.filter(g => localTasks.some(t => t.group === g))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="grid g-4">
                {[
                    { label: 'Hoje',        value: String(stats.today),     unit: `/ ${stats.today + stats.this_week}`, sub: `${stats.today} pendentes`,                               spark: [3,5,4,7,6,8,5,6,4,5,3,stats.today],         accent: 'var(--green)' },
                    { label: 'Atrasadas',   value: String(stats.overdue),                                              sub: stats.overdue === 0 ? 'bom trabalho' : 'requer atenção', spark: [1,2,1,3,2,4,2,3,2,1,2,stats.overdue],       accent: stats.overdue > 0 ? 'var(--rose)' : 'var(--text-3)' },
                    { label: 'Esta semana', value: String(stats.this_week),                                            sub: 'prazo esta semana',                                      spark: [8,10,7,9,11,8,10,9,7,8,10,stats.this_week], accent: 'var(--gold)' },
                    { label: 'Sem prazo',   value: String(stats.no_due),                                               sub: 'sem data',                                               spark: [4,5,3,6,4,7,5,6,4,5,6,stats.no_due],       accent: 'var(--sky)' },
                ].map((s, i) => (
                    <div key={i} className="stat" style={{ padding: '16px 20px' }}>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value" style={{ fontSize: 28 }}>
                            {s.value}{s.unit && <span className="unit">{s.unit}</span>}
                        </div>
                        <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
                        <div className="stat-spark"><Sparkline data={s.spark} accent={s.accent} area /></div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                    {groups.length === 0 && (
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma tarefa encontrada.</div>
                    )}
                    {groups.map(g => {
                        const groupTasks = localTasks.filter(t => t.group === g)
                        return (
                            <div key={g}>
                                <div className="kicker" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span>{GROUP_LABEL[g]}</span>
                                    <span style={{ color: 'var(--text-4)' }}>· {groupTasks.length}</span>
                                </div>
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    {groupTasks.map((t, i) => (
                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                                            <div className="check" data-checked={t.is_done} onClick={() => toggleTask(t.id)} style={{ cursor: 'pointer' }} />
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
                                                    {t.tag && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                            <Icons.Tag size={11} /> {t.tag}
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

                <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <InboxPanel inbox={inbox} inboxCount={inbox_count} projects={projects} />

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
                </aside>
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Criar `TriageModal.tsx`**

Criar `src/resources/js/Pages/Tasks/components/TriageModal.tsx`:

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'

export interface ProjectOption {
    id: number
    title: string
    columns: { id: number; name: string }[]
}

interface Props {
    taskId: number
    taskTitle: string
    projectId: number
    projects: ProjectOption[]
    onClose: () => void
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
    border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
}

export default function TriageModal({ taskId, taskTitle, projectId, projects, onClose }: Props) {
    const project = projects.find(p => p.id === projectId) ?? null
    const [columnId, setColumnId] = useState<number>(project?.columns[0]?.id ?? 0)
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
    const [dueAt, setDueAt] = useState('')

    function submit(e: React.FormEvent) {
        e.preventDefault()
        router.patch(`/projects/tasks/${taskId}/triage`, {
            due_at: dueAt || null,
            priority,
            ...(columnId ? { project_column_id: columnId } : {}),
        }, { preserveScroll: true, onSuccess: onClose })
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
            <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card"
                style={{ width: 440, maxWidth: '90vw', padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="h-3">Processar tarefa</h3>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icons.X size={13} /></button>
                </div>

                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{taskTitle}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label>
                        <div className="kicker" style={{ marginBottom: 4 }}>Coluna</div>
                        <select value={columnId} onChange={(e) => setColumnId(Number(e.target.value))} style={inputStyle}>
                            {(project?.columns ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                    <label>
                        <div className="kicker" style={{ marginBottom: 4 }}>Prioridade</div>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} style={inputStyle}>
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </label>
                </div>

                <label>
                    <div className="kicker" style={{ marginBottom: 4 }}>Prazo</div>
                    <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={inputStyle} />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="btn btn-primary btn-sm">Processar</button>
                </div>
            </form>
        </div>
    )
}
```

- [ ] **Step 3: Criar `InboxPanel.tsx`**

Criar `src/resources/js/Pages/Tasks/components/InboxPanel.tsx`:

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import TriageModal, { ProjectOption } from './TriageModal'
import type { InboxItem } from './TaskListView'

interface Props {
    inbox: InboxItem[]
    inboxCount: number
    projects: ProjectOption[]
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', background: 'var(--surface-2)',
    border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
}

export default function InboxPanel({ inbox, inboxCount, projects }: Props) {
    const [title, setTitle] = useState('')
    const [projectId, setProjectId] = useState<number>(projects[0]?.id ?? 0)
    const [triageItem, setTriageItem] = useState<InboxItem | null>(null)

    function capture(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim() || !projectId) return
        router.post('/tasks/capture', { title, project_id: projectId }, {
            preserveScroll: true,
            onSuccess: () => setTitle(''),
        })
    }

    return (
        <div className="card">
            <div className="card-head">
                <div className="card-title">Inbox <b style={{ color: 'var(--green)' }}>· {inboxCount}</b></div>
            </div>

            {projects.length > 0 && (
                <form onSubmit={capture} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder="Capturar tarefa…" style={inputStyle} />
                    <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} style={inputStyle}>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <button type="submit" className="btn btn-ghost btn-sm" disabled={!title.trim() || !projectId}>Capturar</button>
                </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inbox.length === 0
                    ? <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Inbox vazia.</div>
                    : inbox.map(x => (
                        <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{x.title}</div>
                                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>{x.project_name}</div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setTriageItem(x)}>Processar</button>
                        </div>
                    ))
                }
            </div>

            {triageItem && (
                <TriageModal
                    taskId={triageItem.id}
                    taskTitle={triageItem.title}
                    projectId={triageItem.project_id}
                    projects={projects}
                    onClose={() => setTriageItem(null)}
                />
            )}
        </div>
    )
}
```

- [ ] **Step 4: Reescrever `Index.tsx` como orquestrador de abas**

Substituir `src/resources/js/Pages/Tasks/Index.tsx` inteiro pelo código abaixo. Nesta task o `Index` só renderiza a visão "Lista"; a troca de abas e a aba "Por Projeto" entram na Task 10 (que reescreve este arquivo de novo):

```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import TaskQuickModal, { ProjectOption } from './components/TaskQuickModal'
import TaskListView, { Task, InboxItem } from './components/TaskListView'

interface Props {
    tasks: Task[]
    stats: { today: number; overdue: number; this_week: number; no_due: number }
    by_project: Array<{ project_name: string; count: number }>
    projects: ProjectOption[]
    inbox: InboxItem[]
    inbox_count: number
}

export default function TasksIndex(props: Props) {
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <AppLayout
            title="Tarefas"
            eyebrow="Execução"
            subtitle={`${props.stats.today} tarefas para hoje · ${props.stats.this_week} esta semana.`}
            actions={
                <>
                    <button className="btn btn-ghost btn-sm"><Icons.Filter size={13} /> Filtros</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}><Icons.Plus size={13} /> Nova tarefa</button>
                </>
            }
        >
            <TaskListView
                tasks={props.tasks}
                stats={props.stats}
                by_project={props.by_project}
                projects={props.projects}
                inbox={props.inbox}
                inbox_count={props.inbox_count}
            />

            {createOpen && <TaskQuickModal projects={props.projects} onClose={() => setCreateOpen(false)} />}
        </AppLayout>
    )
}
```

> Nota: `TaskQuickModal` já existe e define/exports `ProjectOption`. `TriageModal` também exporta uma `ProjectOption` com a mesma forma; para evitar conflito, `TaskListView`/`InboxPanel` importam o tipo de `./TriageModal`, e `Index.tsx` importa de `./TaskQuickModal`. As duas têm a mesma estrutura (`{ id, title, columns: {id,name}[] }`), então são compatíveis estruturalmente.

- [ ] **Step 5: Type-check**

Run: `docker compose --profile dev run --rm node sh -c "npx tsc --noEmit -p tsconfig.json --ignoreDeprecations 6.0" 2>&1 | grep -iE "Tasks/Index|TaskListView|InboxPanel|TriageModal" || echo "OK: sem erros nos arquivos tocados"`
Expected: `OK: sem erros nos arquivos tocados`.

- [ ] **Step 6: Commit**

```bash
git add src/resources/js/Pages/Tasks/Index.tsx src/resources/js/Pages/Tasks/components/TaskListView.tsx src/resources/js/Pages/Tasks/components/InboxPanel.tsx src/resources/js/Pages/Tasks/components/TriageModal.tsx
git commit -m "feat(tasks): captura rápida e Processar no Inbox (frontend)"
```

---

# PARTE B — Aba "Por Projeto"

## Task 9: `TasksController@index` expõe `projects_board`

**Files:**
- Modify: `src/app/Domains/Tasks/Controllers/TasksController.php` (método `index`)
- Create: `src/tests/Feature/Tasks/ProjectBoardTest.php`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/tests/Feature/Tasks/ProjectBoardTest.php`:

```php
<?php

namespace Tests\Feature\Tasks;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectBoardTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_exposes_projects_board(): void
    {
        $user = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Alpha', 'status' => 'active']);
        $todo = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A Fazer', 'position' => 0]);
        $done = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'Pendente', 'position' => 0, 'priority' => 'high',
        ]);
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'Pronta', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn ($page) => $page
                ->component('Tasks/Index')
                ->where('projects_board.0.title', 'Alpha')
                ->where('projects_board.0.columns.0.name', 'A Fazer')
                ->where('projects_board.0.columns.0.tasks.0.title', 'Pendente')
                ->where('projects_board.0.columns.0.tasks.0.is_done', false)
                ->where('projects_board.0.columns.1.tasks.0.is_done', true)
            );
    }

    public function test_projects_board_excludes_other_users(): void
    {
        $user  = User::factory()->create();
        $other = User::factory()->create();
        Project::create(['user_id' => $other->id, 'title' => 'Alheio', 'status' => 'active']);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn ($page) => $page
                ->component('Tasks/Index')
                ->where('projects_board', [])
            );
    }
}
```

- [ ] **Step 2: Confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter "test_index_exposes_projects_board|test_projects_board_excludes_other_users"`
Expected: FAIL — prop `projects_board` não existe.

- [ ] **Step 3: Atualizar `index`**

Em `src/app/Domains/Tasks/Controllers/TasksController.php`, antes do `return Inertia::render(...)`, adicionar:

```php
        $board = Project::where('user_id', $user->id)
            ->whereIn('status', ['active', 'paused'])
            ->with(['columns' => fn ($q) => $q->orderBy('position'), 'columns.tasks'])
            ->orderBy('title')
            ->get()
            ->map(fn ($p) => [
                'id'      => $p->id,
                'title'   => $p->title,
                'columns' => $p->columns->map(fn ($c) => [
                    'id'    => $c->id,
                    'name'  => $c->name,
                    'tasks' => $c->tasks->map(fn ($t) => [
                        'id'       => $t->id,
                        'title'    => $t->title,
                        'priority' => $t->priority,
                        'is_done'  => $t->completed_at !== null || $c->isDoneColumn(),
                    ])->values()->toArray(),
                ])->values()->toArray(),
            ])
            ->values()
            ->toArray();
```

E no array do `Inertia::render('Tasks/Index', [...])`, adicionar:

```php
            'projects_board' => $board,
```

- [ ] **Step 4: Confirmar que passam + regressão**

Run: `docker compose exec -T app php artisan test tests/Feature/Tasks`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Tasks/Controllers/TasksController.php src/tests/Feature/Tasks/ProjectBoardTest.php
git commit -m "feat(tasks): index expõe projects_board para a aba Por Projeto"
```

---

## Task 10: Frontend Parte B — abas + `ProjectBoardView`

**Files:**
- Create: `src/resources/js/Pages/Tasks/components/ProjectBoardView.tsx`
- Modify: `src/resources/js/Pages/Tasks/Index.tsx` (adicionar troca de abas)

Sem teste automatizado — `tsc` + checagem visual.

- [ ] **Step 1: Criar `ProjectBoardView.tsx`**

Criar `src/resources/js/Pages/Tasks/components/ProjectBoardView.tsx`:

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'

export interface BoardTask {
    id: number
    title: string
    priority: 'high' | 'medium' | 'low' | null
    is_done: boolean
}
export interface BoardColumn {
    id: number
    name: string
    tasks: BoardTask[]
}
export interface BoardProject {
    id: number
    title: string
    columns: BoardColumn[]
}

interface Props {
    projectsBoard: BoardProject[]
}

const PROJECT_COLORS = [
    'var(--green)', 'var(--gold)', 'var(--sky)', 'var(--rose)',
    'oklch(70% 0.13 320)', 'var(--text-3)',
]
const PRIO_TAG: Record<string, string> = { high: 'tag-rose', medium: 'tag-gold', low: 'tag-sky' }

export default function ProjectBoardView({ projectsBoard }: Props) {
    const [selected, setSelected] = useState<number[]>(() => projectsBoard.map(p => p.id))

    function toggleProject(id: number) {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    function toggleTask(id: number) {
        router.patch(`/projects/tasks/${id}/toggle-done`, {}, { preserveScroll: true })
    }

    const visible = projectsBoard.filter(p => selected.includes(p.id))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {projectsBoard.map((p, i) => {
                    const on = selected.includes(p.id)
                    return (
                        <button key={p.id} className={`tag ${on ? '' : 'tag'}`} onClick={() => toggleProject(p.id)}
                            style={{ cursor: 'pointer', opacity: on ? 1 : 0.45 }}>
                            <span className="dot" style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                            {p.title}
                        </button>
                    )
                })}
            </div>

            {visible.length === 0 && (
                <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum projeto selecionado.</div>
            )}

            {visible.map((p, i) => {
                const idx = projectsBoard.findIndex(x => x.id === p.id)
                const color = PROJECT_COLORS[idx % PROJECT_COLORS.length]
                return (
                    <div key={p.id}>
                        <div className="kicker" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 50, background: color }} />
                            <span>{p.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
                            {p.columns.map(c => (
                                <div key={c.id} className="card" style={{ minWidth: 220, flex: '0 0 220px', padding: 14 }}>
                                    <div className="kicker" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{c.name}</span>
                                        <span style={{ color: 'var(--text-4)' }}>{c.tasks.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {c.tasks.length === 0
                                            ? <div style={{ color: 'var(--text-4)', fontSize: 12, fontStyle: 'italic' }}>—</div>
                                            : c.tasks.map(t => (
                                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="check" data-checked={t.is_done} onClick={() => toggleTask(t.id)} style={{ cursor: 'pointer' }} />
                                                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: t.is_done ? 'var(--text-3)' : 'var(--text)', textDecoration: t.is_done ? 'line-through' : 'none' }}>
                                                        {t.title}
                                                    </div>
                                                    {t.priority && !t.is_done && (
                                                        <span className={`tag ${PRIO_TAG[t.priority]}`}><span className="dot" />{t.priority}</span>
                                                    )}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
```

- [ ] **Step 2: Adicionar a troca de abas no `Index.tsx`**

Substituir `src/resources/js/Pages/Tasks/Index.tsx` inteiro por:

```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import TaskQuickModal, { ProjectOption } from './components/TaskQuickModal'
import TaskListView, { Task, InboxItem } from './components/TaskListView'
import ProjectBoardView, { BoardProject } from './components/ProjectBoardView'

interface Props {
    tasks: Task[]
    stats: { today: number; overdue: number; this_week: number; no_due: number }
    by_project: Array<{ project_name: string; count: number }>
    projects: ProjectOption[]
    inbox: InboxItem[]
    inbox_count: number
    projects_board: BoardProject[]
}

type Tab = 'list' | 'board'

export default function TasksIndex(props: Props) {
    const [createOpen, setCreateOpen] = useState(false)
    const [tab, setTab] = useState<Tab>('list')

    return (
        <AppLayout
            title="Tarefas"
            eyebrow="Execução"
            subtitle={`${props.stats.today} tarefas para hoje · ${props.stats.this_week} esta semana.`}
            actions={
                <>
                    <button className="btn btn-ghost btn-sm"><Icons.Filter size={13} /> Filtros</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}><Icons.Plus size={13} /> Nova tarefa</button>
                </>
            }
        >
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                <button className={`btn btn-sm ${tab === 'list' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('list')}>Lista</button>
                <button className={`btn btn-sm ${tab === 'board' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('board')}>Por projeto</button>
            </div>

            {tab === 'list' ? (
                <TaskListView
                    tasks={props.tasks}
                    stats={props.stats}
                    by_project={props.by_project}
                    projects={props.projects}
                    inbox={props.inbox}
                    inbox_count={props.inbox_count}
                />
            ) : (
                <ProjectBoardView projectsBoard={props.projects_board} />
            )}

            {createOpen && <TaskQuickModal projects={props.projects} onClose={() => setCreateOpen(false)} />}
        </AppLayout>
    )
}
```

- [ ] **Step 3: Type-check**

Run: `docker compose --profile dev run --rm node sh -c "npx tsc --noEmit -p tsconfig.json --ignoreDeprecations 6.0" 2>&1 | grep -iE "Tasks/Index|ProjectBoardView" || echo "OK: sem erros nos arquivos tocados"`
Expected: `OK: sem erros nos arquivos tocados`.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Pages/Tasks/Index.tsx src/resources/js/Pages/Tasks/components/ProjectBoardView.tsx
git commit -m "feat(tasks): aba Por Projeto com filtro multi-projeto (frontend)"
```

---

## Verificação final

- [ ] **Suíte de backend afetada**

Run: `docker compose exec -T app php artisan test tests/Feature/Tasks tests/Feature/Projects tests/Feature/Dashboard`
Expected: PASS (todos).

- [ ] **Type-check completo**

Run: `docker compose --profile dev run --rm node sh -c "npx tsc --noEmit -p tsconfig.json --ignoreDeprecations 6.0" 2>&1 | grep -iE "Tasks/" || echo "OK: sem erros nos arquivos de Tasks"`
Expected: `OK: sem erros nos arquivos de Tasks` (erros pré-existentes em outros arquivos são ignorados).

- [ ] **Checagem visual (Vite de pé)**

`docker compose --profile dev up node -d` → abrir `https://vaultus.local/tasks`:
- Captura rápida no card Inbox cria item na inbox; "Processar" abre o modal, define prazo/coluna/prioridade e some da inbox.
- Mudar uma tarefa de coluna no kanban do projeto a tira da inbox.
- Aba "Por projeto": chips filtram; cada projeto mostra suas colunas reais; checkbox conclui.

---

## Self-Review do plano

**Cobertura da spec:**
- A.1 modelo (`triaged_at` + backfill + `isTriaged`) → Task 1. ✓
- A.2 gatilhos: `store`→Task 2; `capture`→Task 3; `triage`→Task 4; `move`→Task 5; `toggleDone`→Task 6. ✓
- A.3 captura rápida (backend Task 3, frontend Task 8). ✓
- A.4 Processar (backend Task 4, frontend Task 8). ✓
- A.5 Inbox no index (Task 7) + UI (Task 8). ✓
- B.1/B.2 aba Por Projeto (Task 9 backend, Task 10 frontend). ✓
- Testes: presentes por task + verificação final. ✓

**Consistência de tipos/assinaturas:**
- `triaged_at` (datetime), `isTriaged(): bool` — Tasks 1–7. ✓
- `placeTaskInColumn(ProjectTask, int, ?int): void` (já existe) reusado em `triage` (Task 4). ✓
- Props frontend: `inbox`/`inbox_count` (Task 7 ↔ Task 8); `projects_board` (Task 9 ↔ Task 10). ✓
- `ProjectOption {id,title,columns:{id,name}[]}` — `TaskQuickModal` e `TriageModal` definem a mesma forma (compatível estruturalmente). ✓
- `Task`/`InboxItem` exportados de `TaskListView` e importados por `Index`/`InboxPanel`. ✓
- `BoardProject`/`BoardColumn`/`BoardTask` exportados de `ProjectBoardView`, importados por `Index`. ✓

**Escopo:** YAGNI respeitado — sem reatribuir projeto na triagem, sem drag na aba Por Projeto, sem persistir filtro.
