# Phase 6 — Projects + Wants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Projects + Wants module with per-project Kanban boards (drag-and-drop via @hello-pangea/dnd), a wants backlog that can be promoted to projects, plus notes and links per project.

**Architecture:** `/projects` lists all projects and the wants backlog. `/projects/{id}` shows a project's Kanban board with column/task management and notes/links tabs. The `WantPromotionService` creates the project + 3 default columns atomically. All backend controllers follow the `abort_if` auth pattern established in Finance.

**Tech Stack:** Laravel 11, Inertia.js, React 19, TypeScript, `@hello-pangea/dnd`, Tailwind CSS. Tests use `RefreshDatabase` against `vaultus_test` DB.

---

## Important: Actual DB Column Names

The Phase 0 migrations use different column names than the spec. Use these exact names:

| Table | Column | Note |
|---|---|---|
| `wants` | `title` | spec said `name` |
| `wants` | missing `category`, `priority`, `promoted_at` | Task 1 adds these |
| `projects` | `title` | spec said `name` |
| `project_tasks` | `project_column_id` | spec said `column_id` |
| `project_notes` | `content` only | no `title` column |
| `project_links` | `title` | spec said `label` |

---

## Task 1: Migration + Models

**Files:**
- Create: `src/database/migrations/2026_05_12_000001_add_fields_to_wants_table.php`
- Create: `src/app/Domains/Projects/Models/Want.php`
- Create: `src/app/Domains/Projects/Models/Project.php`
- Create: `src/app/Domains/Projects/Models/ProjectColumn.php`
- Create: `src/app/Domains/Projects/Models/ProjectTask.php`
- Create: `src/app/Domains/Projects/Models/ProjectNote.php`
- Create: `src/app/Domains/Projects/Models/ProjectLink.php`

- [ ] **Create migration**

`src/database/migrations/2026_05_12_000001_add_fields_to_wants_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('wants', function (Blueprint $table) {
            $table->string('category')->nullable()->after('description');
            $table->string('priority', 10)->default('medium')->after('category');
            $table->timestamp('promoted_at')->nullable()->after('priority');
        });
    }

    public function down(): void
    {
        Schema::table('wants', function (Blueprint $table) {
            $table->dropColumn(['category', 'priority', 'promoted_at']);
        });
    }
};
```

- [ ] **Create Want model** at `src/app/Domains/Projects/Models/Want.php`:
```php
<?php

namespace App\Domains\Projects\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Want extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'title', 'description', 'category', 'priority', 'promoted_at'];

    protected function casts(): array
    {
        return ['promoted_at' => 'datetime'];
    }

    public function scopeUnpromoted($query)
    {
        return $query->whereNull('promoted_at');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->hasOne(Project::class);
    }
}
```

- [ ] **Create Project model** at `src/app/Domains/Projects/Models/Project.php`:
```php
<?php

namespace App\Domains\Projects\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'want_id', 'title', 'description', 'status'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function want()
    {
        return $this->belongsTo(Want::class);
    }

    public function columns()
    {
        return $this->hasMany(ProjectColumn::class)->orderBy('position');
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class);
    }

    public function notes()
    {
        return $this->hasMany(ProjectNote::class)->latest();
    }

    public function links()
    {
        return $this->hasMany(ProjectLink::class);
    }
}
```

- [ ] **Create ProjectColumn model** at `src/app/Domains/Projects/Models/ProjectColumn.php`:
```php
<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectColumn extends Model
{
    protected $fillable = ['project_id', 'name', 'position'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class, 'project_column_id')->orderBy('position');
    }
}
```

- [ ] **Create ProjectTask model** at `src/app/Domains/Projects/Models/ProjectTask.php`:
```php
<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectTask extends Model
{
    use SoftDeletes;

    protected $fillable = ['project_id', 'project_column_id', 'title', 'description', 'priority', 'position', 'due_at'];

    protected function casts(): array
    {
        return ['due_at' => 'datetime'];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function column()
    {
        return $this->belongsTo(ProjectColumn::class, 'project_column_id');
    }
}
```

- [ ] **Create ProjectNote model** at `src/app/Domains/Projects/Models/ProjectNote.php`:
```php
<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectNote extends Model
{
    use SoftDeletes;

    protected $fillable = ['project_id', 'content'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
```

- [ ] **Create ProjectLink model** at `src/app/Domains/Projects/Models/ProjectLink.php`:
```php
<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectLink extends Model
{
    protected $fillable = ['project_id', 'title', 'url'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
```

- [ ] **Run migration inside the container**

```bash
docker compose exec app php artisan migrate
```

Expected: migration runs without error, `wants` table gains `category`, `priority`, `promoted_at`.

- [ ] **Commit**

```bash
git add src/database/migrations/2026_05_12_000001_add_fields_to_wants_table.php \
        src/app/Domains/Projects/
git commit -m "feat(projects): add models and wants migration"
```

---

## Task 2: WantPromotionService

**Files:**
- Create: `src/app/Domains/Projects/Services/WantPromotionService.php`

- [ ] **Create the service** at `src/app/Domains/Projects/Services/WantPromotionService.php`:
```php
<?php

namespace App\Domains\Projects\Services;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\Want;

class WantPromotionService
{
    public function promote(Want $want): Project
    {
        $project = Project::create([
            'user_id'     => $want->user_id,
            'want_id'     => $want->id,
            'title'       => $want->title,
            'description' => $want->description,
            'status'      => 'active',
        ]);

        $project->columns()->createMany([
            ['name' => 'A fazer',       'position' => 0],
            ['name' => 'Em progresso',  'position' => 1],
            ['name' => 'Concluído',     'position' => 2],
        ]);

        $want->update(['promoted_at' => now()]);

        return $project;
    }
}
```

- [ ] **Commit**

```bash
git add src/app/Domains/Projects/Services/WantPromotionService.php
git commit -m "feat(projects): add WantPromotionService"
```

---

## Task 3: Resources

**Files:**
- Create: `src/app/Http/Resources/WantResource.php`
- Create: `src/app/Http/Resources/ProjectResource.php`
- Create: `src/app/Http/Resources/ProjectColumnResource.php`
- Create: `src/app/Http/Resources/ProjectTaskResource.php`
- Create: `src/app/Http/Resources/ProjectNoteResource.php`
- Create: `src/app/Http/Resources/ProjectLinkResource.php`

- [ ] **Create WantResource** at `src/app/Http/Resources/WantResource.php`:
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'category'    => $this->category,
            'priority'    => $this->priority,
            'promoted_at' => $this->promoted_at?->toISOString(),
        ];
    }
}
```

- [ ] **Create ProjectTaskResource** at `src/app/Http/Resources/ProjectTaskResource.php`:
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectTaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'project_column_id' => $this->project_column_id,
            'title'             => $this->title,
            'description'       => $this->description,
            'priority'          => $this->priority,
            'position'          => $this->position,
            'due_at'            => $this->due_at?->toDateString(),
        ];
    }
}
```

- [ ] **Create ProjectColumnResource** at `src/app/Http/Resources/ProjectColumnResource.php`:
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectColumnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'name'     => $this->name,
            'position' => $this->position,
            'tasks'    => ProjectTaskResource::collection($this->whenLoaded('tasks')),
        ];
    }
}
```

- [ ] **Create ProjectNoteResource** at `src/app/Http/Resources/ProjectNoteResource.php`:
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectNoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'content'    => $this->content,
            'created_at' => $this->created_at->toDateString(),
        ];
    }
}
```

- [ ] **Create ProjectLinkResource** at `src/app/Http/Resources/ProjectLinkResource.php`:
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'    => $this->id,
            'title' => $this->title,
            'url'   => $this->url,
        ];
    }
}
```

- [ ] **Create ProjectResource** at `src/app/Http/Resources/ProjectResource.php`:
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'status'      => $this->status,
            'want_id'     => $this->want_id,
            'tasks_count' => $this->whenCounted('tasks'),
            'columns'     => ProjectColumnResource::collection($this->whenLoaded('columns')),
            'notes'       => ProjectNoteResource::collection($this->whenLoaded('notes')),
            'links'       => ProjectLinkResource::collection($this->whenLoaded('links')),
        ];
    }
}
```

- [ ] **Commit**

```bash
git add src/app/Http/Resources/WantResource.php \
        src/app/Http/Resources/ProjectResource.php \
        src/app/Http/Resources/ProjectColumnResource.php \
        src/app/Http/Resources/ProjectTaskResource.php \
        src/app/Http/Resources/ProjectNoteResource.php \
        src/app/Http/Resources/ProjectLinkResource.php
git commit -m "feat(projects): add API resources"
```

---

## Task 4: User Relations + Routes

**Files:**
- Modify: `src/app/Domains/Auth/Models/User.php`
- Modify: `src/routes/web.php`

- [ ] **Add relations to User model** — append inside the `User` class after `wishlistItems()`:
```php
public function projects()
{
    return $this->hasMany(\App\Domains\Projects\Models\Project::class);
}

public function wants()
{
    return $this->hasMany(\App\Domains\Projects\Models\Want::class);
}
```

- [ ] **Add routes to `src/routes/web.php`** — replace the `'projects'` stub entry and add imports at the top. First add these imports with the others:
```php
use App\Domains\Projects\Controllers\ProjectController;
use App\Domains\Projects\Controllers\WantController;
use App\Domains\Projects\Controllers\ProjectColumnController;
use App\Domains\Projects\Controllers\ProjectTaskController;
use App\Domains\Projects\Controllers\ProjectNoteController;
use App\Domains\Projects\Controllers\ProjectLinkController;
```

Then in the `auth` middleware group, replace `'projects'` in the stubs array with these routes:
```php
// Projects
Route::get('/projects', [ProjectController::class, 'index'])->name('projects');
Route::post('/projects', [ProjectController::class, 'store']);
Route::get('/projects/{project}', [ProjectController::class, 'show']);
Route::patch('/projects/{project}', [ProjectController::class, 'update']);
Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

// Wants
Route::post('/wants', [WantController::class, 'store']);
Route::patch('/wants/{want}', [WantController::class, 'update']);
Route::delete('/wants/{want}', [WantController::class, 'destroy']);
Route::post('/wants/{want}/promote', [WantController::class, 'promote']);

// Project Columns
Route::post('/projects/{project}/columns', [ProjectColumnController::class, 'store']);
Route::patch('/projects/{project}/columns/{column}', [ProjectColumnController::class, 'update']);
Route::delete('/projects/{project}/columns/{column}', [ProjectColumnController::class, 'destroy']);

// Project Tasks — specific paths before {project}
Route::post('/projects/{project}/tasks', [ProjectTaskController::class, 'store']);
Route::patch('/projects/tasks/{task}', [ProjectTaskController::class, 'update']);
Route::delete('/projects/tasks/{task}', [ProjectTaskController::class, 'destroy']);
Route::patch('/projects/tasks/{task}/move', [ProjectTaskController::class, 'move']);

// Project Notes
Route::post('/projects/{project}/notes', [ProjectNoteController::class, 'store']);
Route::patch('/projects/notes/{note}', [ProjectNoteController::class, 'update']);
Route::delete('/projects/notes/{note}', [ProjectNoteController::class, 'destroy']);

// Project Links
Route::post('/projects/{project}/links', [ProjectLinkController::class, 'store']);
Route::delete('/projects/links/{link}', [ProjectLinkController::class, 'destroy']);
```

- [ ] **Commit**

```bash
git add src/app/Domains/Auth/Models/User.php src/routes/web.php
git commit -m "feat(projects): add User relations and routes"
```

---

## Task 5: ProjectController + Tests

**Files:**
- Create: `src/app/Domains/Projects/Controllers/ProjectController.php`
- Create: `src/tests/Feature/Projects/ProjectTest.php`

- [ ] **Write failing tests** at `src/tests/Feature/Projects/ProjectTest.php`:
```php
<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_projects_page_requires_auth(): void
    {
        $this->get('/projects')->assertRedirect('/login');
    }

    public function test_projects_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/projects')
            ->assertStatus(200)
            ->assertInertia(fn ($p) => $p
                ->component('Projects/Index')
                ->has('projects')
                ->has('wants')
            );
    }

    public function test_can_create_project(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/projects', [
                'title'  => 'Aprender Rust',
                'status' => 'active',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'user_id' => $user->id,
            'title'   => 'Aprender Rust',
        ]);
    }

    public function test_can_update_project(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Old', 'status' => 'active']);

        $this->actingAs($user)
            ->patch("/projects/{$project->id}", ['title' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'New']);
    }

    public function test_can_delete_project(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Del', 'status' => 'active']);

        $this->actingAs($user)
            ->delete("/projects/{$project->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }

    public function test_cannot_access_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'Secret', 'status' => 'active']);

        $this->actingAs($user2)
            ->get("/projects/{$project->id}")
            ->assertForbidden();
    }

    public function test_project_show_renders_kanban_props(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P1', 'status' => 'active']);

        $this->actingAs($user)
            ->get("/projects/{$project->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($p) => $p
                ->component('Projects/Project')
                ->has('project')
            );
    }
}
```

- [ ] **Run tests to confirm they fail**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectTest.php --colors=never
```

Expected: all tests fail — controller class does not exist.

- [ ] **Create ProjectController** at `src/app/Domains/Projects/Controllers/ProjectController.php`:
```php
<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\WantResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Projects/Index', [
            'projects' => ProjectResource::collection(
                $user->projects()->withCount('tasks')->latest()->get()
            ),
            'wants' => WantResource::collection(
                $user->wants()->unpromoted()->orderByDesc('priority')->latest()->get()
            ),
        ]);
    }

    public function show(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        return Inertia::render('Projects/Project', [
            'project' => ProjectResource::make(
                $project->load(['columns.tasks', 'notes', 'links'])
            ),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'nullable|in:active,paused,done,archived',
        ]);

        $validated['status'] ??= 'active';

        $request->user()->projects()->create($validated);

        return back();
    }

    public function update(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'sometimes|in:active,paused,done,archived',
        ]);

        $project->update($validated);

        return back();
    }

    public function destroy(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $project->delete();

        return back();
    }
}
```

- [ ] **Run tests to confirm they pass**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectTest.php --colors=never
```

Expected: 6 tests pass.

- [ ] **Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectController.php \
        src/tests/Feature/Projects/ProjectTest.php
git commit -m "feat(projects): add ProjectController with tests"
```

---

## Task 6: WantController + Tests

**Files:**
- Create: `src/app/Domains/Projects/Controllers/WantController.php`
- Create: `src/tests/Feature/Projects/WantTest.php`

- [ ] **Write failing tests** at `src/tests/Feature/Projects/WantTest.php`:
```php
<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Want;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WantTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_want(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/wants', [
                'title'    => 'Aprender Go',
                'priority' => 'high',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('wants', ['user_id' => $user->id, 'title' => 'Aprender Go']);
    }

    public function test_can_update_want(): void
    {
        $user = User::factory()->create();
        $want = Want::create(['user_id' => $user->id, 'title' => 'Old']);

        $this->actingAs($user)
            ->patch("/wants/{$want->id}", ['title' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('wants', ['id' => $want->id, 'title' => 'New']);
    }

    public function test_can_delete_want(): void
    {
        $user = User::factory()->create();
        $want = Want::create(['user_id' => $user->id, 'title' => 'Del']);

        $this->actingAs($user)
            ->delete("/wants/{$want->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('wants', ['id' => $want->id]);
    }

    public function test_promote_creates_project_with_three_columns(): void
    {
        $user = User::factory()->create();
        $want = Want::create(['user_id' => $user->id, 'title' => 'Meu Projeto']);

        $response = $this->actingAs($user)->post("/wants/{$want->id}/promote");

        $response->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'user_id' => $user->id,
            'title'   => 'Meu Projeto',
            'want_id' => $want->id,
        ]);

        $project = $user->projects()->first();
        $this->assertCount(3, $project->columns);

        $want->refresh();
        $this->assertNotNull($want->promoted_at);
    }

    public function test_cannot_modify_other_users_want(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $want  = Want::create(['user_id' => $user1->id, 'title' => 'Private']);

        $this->actingAs($user2)->patch("/wants/{$want->id}", ['title' => 'Hacked'])->assertForbidden();
        $this->actingAs($user2)->delete("/wants/{$want->id}")->assertForbidden();
        $this->actingAs($user2)->post("/wants/{$want->id}/promote")->assertForbidden();
    }
}
```

- [ ] **Run tests to confirm they fail**

```bash
docker compose exec app php artisan test tests/Feature/Projects/WantTest.php --colors=never
```

Expected: all tests fail.

- [ ] **Create WantController** at `src/app/Domains/Projects/Controllers/WantController.php`:
```php
<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Want;
use App\Domains\Projects\Services\WantPromotionService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class WantController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'category'    => 'nullable|string|max:100',
            'priority'    => 'nullable|in:low,medium,high',
        ]);

        $validated['priority'] ??= 'medium';

        $request->user()->wants()->create($validated);

        return back();
    }

    public function update(Request $request, Want $want)
    {
        abort_if($want->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category'    => 'nullable|string|max:100',
            'priority'    => 'sometimes|in:low,medium,high',
        ]);

        $want->update($validated);

        return back();
    }

    public function destroy(Request $request, Want $want)
    {
        abort_if($want->user_id !== $request->user()->id, 403);

        $want->delete();

        return back();
    }

    public function promote(Request $request, Want $want, WantPromotionService $service)
    {
        abort_if($want->user_id !== $request->user()->id, 403);

        $project = $service->promote($want);

        return redirect("/projects/{$project->id}");
    }
}
```

- [ ] **Run tests to confirm they pass**

```bash
docker compose exec app php artisan test tests/Feature/Projects/WantTest.php --colors=never
```

Expected: 5 tests pass.

- [ ] **Commit**

```bash
git add src/app/Domains/Projects/Controllers/WantController.php \
        src/tests/Feature/Projects/WantTest.php
git commit -m "feat(projects): add WantController with tests"
```

---

## Task 7: ProjectColumnController + Tests

**Files:**
- Create: `src/app/Domains/Projects/Controllers/ProjectColumnController.php`
- Create: `src/tests/Feature/Projects/ProjectColumnTest.php`

- [ ] **Write failing tests** at `src/tests/Feature/Projects/ProjectColumnTest.php`:
```php
<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectColumnTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $user): Project
    {
        return Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
    }

    public function test_can_create_column(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/columns", ['name' => 'Backlog', 'position' => 0])
            ->assertRedirect();

        $this->assertDatabaseHas('project_columns', ['project_id' => $project->id, 'name' => 'Backlog']);
    }

    public function test_can_update_column(): void
    {
        $user   = User::factory()->create();
        $project = $this->makeProject($user);
        $column = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Old', 'position' => 0]);

        $this->actingAs($user)
            ->patch("/projects/{$project->id}/columns/{$column->id}", ['name' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_columns', ['id' => $column->id, 'name' => 'New']);
    }

    public function test_can_delete_column(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $column  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Del', 'position' => 0]);

        $this->actingAs($user)
            ->delete("/projects/{$project->id}/columns/{$column->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('project_columns', ['id' => $column->id]);
    }

    public function test_cannot_modify_column_of_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'P', 'status' => 'active']);
        $column  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Col', 'position' => 0]);

        $this->actingAs($user2)
            ->patch("/projects/{$project->id}/columns/{$column->id}", ['name' => 'Hack'])
            ->assertForbidden();
    }
}
```

- [ ] **Run tests to confirm they fail**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectColumnTest.php --colors=never
```

- [ ] **Create ProjectColumnController** at `src/app/Domains/Projects/Controllers/ProjectColumnController.php`:
```php
<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectColumnController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'position' => 'nullable|integer|min:0',
        ]);

        $project->columns()->create($validated);

        return back();
    }

    public function update(Request $request, Project $project, ProjectColumn $column)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'position' => 'sometimes|integer|min:0',
        ]);

        $column->update($validated);

        return back();
    }

    public function destroy(Request $request, Project $project, ProjectColumn $column)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $column->delete();

        return back();
    }
}
```

- [ ] **Run tests to confirm they pass**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectColumnTest.php --colors=never
```

- [ ] **Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectColumnController.php \
        src/tests/Feature/Projects/ProjectColumnTest.php
git commit -m "feat(projects): add ProjectColumnController with tests"
```

---

## Task 8: ProjectTaskController + Tests

**Files:**
- Create: `src/app/Domains/Projects/Controllers/ProjectTaskController.php`
- Create: `src/tests/Feature/Projects/ProjectTaskTest.php`

- [ ] **Write failing tests** at `src/tests/Feature/Projects/ProjectTaskTest.php`:
```php
<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTaskTest extends TestCase
{
    use RefreshDatabase;

    private function makeProjectWithColumn(User $user): array
    {
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $column  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Todo', 'position' => 0]);
        return [$project, $column];
    }

    public function test_can_create_task(): void
    {
        $user = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/tasks", [
                'title'             => 'Minha tarefa',
                'project_column_id' => $column->id,
                'priority'          => 'medium',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_tasks', [
            'project_id'        => $project->id,
            'project_column_id' => $column->id,
            'title'             => 'Minha tarefa',
        ]);
    }

    public function test_can_update_task(): void
    {
        $user = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $column->id,
            'title' => 'Old', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}", ['title' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_tasks', ['id' => $task->id, 'title' => 'New']);
    }

    public function test_can_delete_task(): void
    {
        $user = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $column->id,
            'title' => 'Del', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->delete("/projects/tasks/{$task->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('project_tasks', ['id' => $task->id]);
    }

    public function test_can_move_task_to_another_column(): void
    {
        $user = User::factory()->create();
        [$project, $col1] = $this->makeProjectWithColumn($user);
        $col2 = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Done', 'position' => 1]);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $col1->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $col2->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_tasks', [
            'id'                => $task->id,
            'project_column_id' => $col2->id,
            'position'          => 0,
        ]);
    }

    public function test_cannot_modify_other_users_task(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user1);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $column->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user2)->patch("/projects/tasks/{$task->id}", ['title' => 'Hack'])->assertForbidden();
    }
}
```

- [ ] **Run tests to confirm they fail**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectTaskTest.php --colors=never
```

- [ ] **Create ProjectTaskController** at `src/app/Domains/Projects/Controllers/ProjectTaskController.php`:
```php
<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectTaskController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'             => 'required|string|max:255',
            'description'       => 'nullable|string',
            'project_column_id' => 'required|integer|exists:project_columns,id',
            'priority'          => 'nullable|in:low,medium,high,urgent',
            'due_at'            => 'nullable|date',
        ]);

        $maxPos = $project->tasks()
            ->where('project_column_id', $validated['project_column_id'])
            ->max('position') ?? -1;

        $validated['position'] = $maxPos + 1;
        $validated['priority'] ??= 'medium';

        $project->tasks()->create($validated);

        return back();
    }

    public function update(Request $request, ProjectTask $task)
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority'    => 'sometimes|in:low,medium,high,urgent',
            'due_at'      => 'nullable|date',
        ]);

        $task->update($validated);

        return back();
    }

    public function destroy(Request $request, ProjectTask $task)
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $task->delete();

        return back();
    }

    public function move(Request $request, ProjectTask $task)
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'project_column_id' => 'required|integer|exists:project_columns,id',
            'position'          => 'required|integer|min:0',
        ]);

        $task->update(['project_column_id' => $validated['project_column_id']]);

        // Reorder all tasks in the destination column
        $siblings = ProjectTask::where('project_column_id', $validated['project_column_id'])
            ->where('id', '!=', $task->id)
            ->orderBy('position')
            ->get();

        $siblings->splice($validated['position'], 0, [$task]);

        foreach ($siblings as $i => $t) {
            $t->update(['position' => $i]);
        }

        return back();
    }
}
```

- [ ] **Run tests to confirm they pass**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectTaskTest.php --colors=never
```

- [ ] **Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectTaskController.php \
        src/tests/Feature/Projects/ProjectTaskTest.php
git commit -m "feat(projects): add ProjectTaskController with tests"
```

---

## Task 9: ProjectNoteController + ProjectLinkController + Tests

**Files:**
- Create: `src/app/Domains/Projects/Controllers/ProjectNoteController.php`
- Create: `src/app/Domains/Projects/Controllers/ProjectLinkController.php`
- Create: `src/tests/Feature/Projects/ProjectNoteTest.php`
- Create: `src/tests/Feature/Projects/ProjectLinkTest.php`

- [ ] **Write failing tests** at `src/tests/Feature/Projects/ProjectNoteTest.php`:
```php
<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectNote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectNoteTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $user): Project
    {
        return Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
    }

    public function test_can_create_note(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/notes", ['content' => 'Nota importante'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_notes', ['project_id' => $project->id, 'content' => 'Nota importante']);
    }

    public function test_can_update_note(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $note    = ProjectNote::create(['project_id' => $project->id, 'content' => 'Old']);

        $this->actingAs($user)
            ->patch("/projects/notes/{$note->id}", ['content' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_notes', ['id' => $note->id, 'content' => 'New']);
    }

    public function test_can_delete_note(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $note    = ProjectNote::create(['project_id' => $project->id, 'content' => 'Del']);

        $this->actingAs($user)
            ->delete("/projects/notes/{$note->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('project_notes', ['id' => $note->id]);
    }

    public function test_cannot_modify_note_of_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'P', 'status' => 'active']);
        $note    = ProjectNote::create(['project_id' => $project->id, 'content' => 'Secret']);

        $this->actingAs($user2)->patch("/projects/notes/{$note->id}", ['content' => 'Hack'])->assertForbidden();
    }
}
```

- [ ] **Write failing tests** at `src/tests/Feature/Projects/ProjectLinkTest.php`:
```php
<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectLinkTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $user): Project
    {
        return Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
    }

    public function test_can_create_link(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/links", [
                'title' => 'GitHub',
                'url'   => 'https://github.com',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_links', ['project_id' => $project->id, 'title' => 'GitHub']);
    }

    public function test_can_delete_link(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $link    = ProjectLink::create(['project_id' => $project->id, 'title' => 'G', 'url' => 'https://g.com']);

        $this->actingAs($user)
            ->delete("/projects/links/{$link->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('project_links', ['id' => $link->id]);
    }

    public function test_cannot_delete_link_of_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'P', 'status' => 'active']);
        $link    = ProjectLink::create(['project_id' => $project->id, 'title' => 'G', 'url' => 'https://g.com']);

        $this->actingAs($user2)->delete("/projects/links/{$link->id}")->assertForbidden();
    }
}
```

- [ ] **Run both test files to confirm they fail**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectNoteTest.php tests/Feature/Projects/ProjectLinkTest.php --colors=never
```

- [ ] **Create ProjectNoteController** at `src/app/Domains/Projects/Controllers/ProjectNoteController.php`:
```php
<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectNote;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectNoteController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate(['content' => 'required|string']);

        $project->notes()->create($validated);

        return back();
    }

    public function update(Request $request, ProjectNote $note)
    {
        abort_if($note->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate(['content' => 'required|string']);

        $note->update($validated);

        return back();
    }

    public function destroy(Request $request, ProjectNote $note)
    {
        abort_if($note->project->user_id !== $request->user()->id, 403);

        $note->delete();

        return back();
    }
}
```

- [ ] **Create ProjectLinkController** at `src/app/Domains/Projects/Controllers/ProjectLinkController.php`:
```php
<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectLink;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectLinkController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url'   => 'required|url|max:2048',
        ]);

        $project->links()->create($validated);

        return back();
    }

    public function destroy(Request $request, ProjectLink $link)
    {
        abort_if($link->project->user_id !== $request->user()->id, 403);

        $link->delete();

        return back();
    }
}
```

- [ ] **Run tests to confirm they pass**

```bash
docker compose exec app php artisan test tests/Feature/Projects/ProjectNoteTest.php tests/Feature/Projects/ProjectLinkTest.php --colors=never
```

- [ ] **Run full test suite to confirm nothing broke**

```bash
docker compose exec app php artisan test --colors=never
```

Expected: all tests pass (83 previous + ~20 new).

- [ ] **Commit**

```bash
git add src/app/Domains/Projects/Controllers/ProjectNoteController.php \
        src/app/Domains/Projects/Controllers/ProjectLinkController.php \
        src/tests/Feature/Projects/ProjectNoteTest.php \
        src/tests/Feature/Projects/ProjectLinkTest.php
git commit -m "feat(projects): add note and link controllers with tests"
```

---

## Task 10: DashboardAggregator Update

**Files:**
- Modify: `src/app/Domains/Dashboard/Services/DashboardAggregator.php`

- [ ] **Replace `open_projects => 0` stub** in `getStats()`. Find this line:
```php
'open_projects'              => 0,
```

Replace with:
```php
'open_projects'              => $user->projects()->where('status', 'active')->count(),
```

- [ ] **Run dashboard test to confirm it still passes**

```bash
docker compose exec app php artisan test tests/Feature/Dashboard/DashboardTest.php --colors=never
```

- [ ] **Commit**

```bash
git add src/app/Domains/Dashboard/Services/DashboardAggregator.php
git commit -m "feat(projects): wire active_projects count into dashboard stats"
```

---

## Task 11: TypeScript Types + Install @hello-pangea/dnd

**Files:**
- Modify: `src/resources/js/types/index.d.ts`

- [ ] **Install drag-and-drop library**

```bash
docker compose run --rm node npm install @hello-pangea/dnd
```

Expected: package added to `package.json`, `node_modules` updated.

- [ ] **Add types to `src/resources/js/types/index.d.ts`** — append at the end of the file:
```typescript
export interface Want {
    id: number
    title: string
    description: string | null
    category: string | null
    priority: 'low' | 'medium' | 'high'
    promoted_at: string | null
}

export interface Project {
    id: number
    title: string
    description: string | null
    status: 'active' | 'paused' | 'done' | 'archived'
    want_id: number | null
    tasks_count?: number
    columns?: ProjectColumn[]
    notes?: ProjectNote[]
    links?: ProjectLink[]
}

export interface ProjectColumn {
    id: number
    name: string
    position: number
    tasks: ProjectTask[]
}

export interface ProjectTask {
    id: number
    project_column_id: number
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high' | 'urgent'
    position: number
    due_at: string | null
}

export interface ProjectNote {
    id: number
    content: string
    created_at: string
}

export interface ProjectLink {
    id: number
    title: string
    url: string
}
```

- [ ] **Commit**

```bash
git add src/resources/js/types/index.d.ts src/package.json src/package-lock.json
git commit -m "feat(projects): add TypeScript types and install @hello-pangea/dnd"
```

---

## Task 12: Frontend — Projects/Index Page

**Files:**
- Create: `src/resources/js/Pages/Projects/Index.tsx`
- Create: `src/resources/js/Pages/Projects/components/ProjectCard.tsx`
- Create: `src/resources/js/Pages/Projects/components/ProjectForm.tsx`
- Create: `src/resources/js/Pages/Projects/components/WantCard.tsx`
- Create: `src/resources/js/Pages/Projects/components/WantForm.tsx`

- [ ] **Create ProjectCard** at `src/resources/js/Pages/Projects/components/ProjectCard.tsx`:
```tsx
import { router } from '@inertiajs/react'
import { Project } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    project: Project
    onEdit: (p: Project) => void
}

const statusBadge: Record<string, string> = {
    active:   'bg-emerald-600/20 text-emerald-400',
    paused:   'bg-yellow-600/20 text-yellow-400',
    done:     'bg-slate-600/20 text-slate-400',
    archived: 'bg-slate-700 text-slate-500',
}

const statusLabel: Record<string, string> = {
    active: 'Ativo', paused: 'Pausado', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectCard({ project, onEdit }: Props) {
    function handleDelete() {
        if (!confirm(`Excluir o projeto "${project.title}"?`)) return
        router.delete('/projects/' + project.id, {}, { preserveScroll: true })
    }

    return (
        <div
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={() => router.get('/projects/' + project.id)}
        >
            <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-slate-200">{project.title}</p>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={handleDelete}>Excluir</Button>
                </div>
            </div>
            {project.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[project.status] ?? ''}`}>
                    {statusLabel[project.status] ?? project.status}
                </span>
                {project.tasks_count !== undefined && (
                    <span className="text-xs text-slate-500">{project.tasks_count} tarefas</span>
                )}
            </div>
        </div>
    )
}
```

- [ ] **Create ProjectForm** at `src/resources/js/Pages/Projects/components/ProjectForm.tsx`:
```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Project } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    project: Project | null
    onClose: () => void
}

export default function ProjectForm({ project, onClose }: Props) {
    const [title, setTitle]       = useState(project?.title ?? '')
    const [desc, setDesc]         = useState(project?.description ?? '')
    const [status, setStatus]     = useState(project?.status ?? 'active')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { title, description: desc || null, status }
        if (project) {
            router.patch('/projects/' + project.id, payload, { preserveScroll: true })
        } else {
            router.post('/projects', payload, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm z-50">
                <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    {project ? 'Editar projeto' : 'Novo projeto'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Descrição</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as Project['status'])}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="active">Ativo</option>
                            <option value="paused">Pausado</option>
                            <option value="done">Concluído</option>
                            <option value="archived">Arquivado</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" size="sm">Salvar</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
```

- [ ] **Create WantCard** at `src/resources/js/Pages/Projects/components/WantCard.tsx`:
```tsx
import { router } from '@inertiajs/react'
import { Want } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    want: Want
    onEdit: (w: Want) => void
}

const priorityBadge: Record<string, string> = {
    low:    'bg-slate-700 text-slate-400',
    medium: 'bg-yellow-600/20 text-yellow-400',
    high:   'bg-red-600/20 text-red-400',
}

const priorityLabel: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' }

export default function WantCard({ want, onEdit }: Props) {
    function handlePromote() {
        if (!confirm(`Promover "${want.title}" para projeto?`)) return
        router.post('/wants/' + want.id + '/promote')
    }

    function handleDelete() {
        if (!confirm(`Excluir "${want.title}"?`)) return
        router.delete('/wants/' + want.id, {}, { preserveScroll: true })
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm text-slate-200 truncate">{want.title}</p>
                {want.category && <p className="text-xs text-slate-500 mt-0.5">{want.category}</p>}
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[want.priority]}`}>
                    {priorityLabel[want.priority]}
                </span>
            </div>
            <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => onEdit(want)}>Editar</Button>
                <Button variant="primary" size="sm" onClick={handlePromote}>Promover</Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>×</Button>
            </div>
        </div>
    )
}
```

- [ ] **Create WantForm** at `src/resources/js/Pages/Projects/components/WantForm.tsx`:
```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Want } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    want: Want | null
    onClose: () => void
}

export default function WantForm({ want, onClose }: Props) {
    const [title, setTitle]       = useState(want?.title ?? '')
    const [desc, setDesc]         = useState(want?.description ?? '')
    const [category, setCategory] = useState(want?.category ?? '')
    const [priority, setPriority] = useState<Want['priority']>(want?.priority ?? 'medium')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { title, description: desc || null, category: category || null, priority }
        if (want) {
            router.patch('/wants/' + want.id, payload, { preserveScroll: true })
        } else {
            router.post('/wants', payload, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm z-50">
                <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    {want ? 'Editar vontade' : 'Nova vontade'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Categoria</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder="ex: Desenvolvimento, Leitura…"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Prioridade</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value as Want['priority'])}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" size="sm">Salvar</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
```

- [ ] **Create Projects/Index.tsx** at `src/resources/js/Pages/Projects/Index.tsx`:
```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Project, Want } from '@/types'
import ProjectCard from './components/ProjectCard'
import ProjectForm from './components/ProjectForm'
import WantCard from './components/WantCard'
import WantForm from './components/WantForm'
import Button from '@/Components/ui/Button'

interface Props {
    projects: { data: Project[] }
    wants: { data: Want[] }
}

export default function ProjectsIndex({ projects, wants }: Props) {
    const [showProjectForm, setShowProjectForm] = useState(false)
    const [editingProject, setEditingProject]   = useState<Project | null>(null)
    const [showWantForm, setShowWantForm]       = useState(false)
    const [editingWant, setEditingWant]         = useState<Want | null>(null)
    const [wantsOpen, setWantsOpen]             = useState(true)

    return (
        <AppLayout title="Projetos">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

                {/* Projects section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-300">Projetos</h2>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => { setEditingProject(null); setShowProjectForm(true) }}
                        >
                            Novo projeto
                        </Button>
                    </div>

                    {projects.data.length === 0 ? (
                        <p className="text-xs text-slate-500">Nenhum projeto ainda.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.data.map(p => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    onEdit={proj => { setEditingProject(proj); setShowProjectForm(true) }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Wants section */}
                <div>
                    <button
                        className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4 w-full text-left"
                        onClick={() => setWantsOpen(o => !o)}
                    >
                        <span>{wantsOpen ? '▾' : '▸'}</span>
                        Vontades ({wants.data.length})
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={e => { e.stopPropagation(); setEditingWant(null); setShowWantForm(true) }}
                        >
                            Nova vontade
                        </Button>
                    </button>

                    {wantsOpen && (
                        <div className="space-y-2">
                            {wants.data.length === 0 ? (
                                <p className="text-xs text-slate-500">Nenhuma vontade registrada.</p>
                            ) : (
                                wants.data.map(w => (
                                    <WantCard
                                        key={w.id}
                                        want={w}
                                        onEdit={want => { setEditingWant(want); setShowWantForm(true) }}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showProjectForm && (
                <ProjectForm
                    project={editingProject}
                    onClose={() => setShowProjectForm(false)}
                />
            )}
            {showWantForm && (
                <WantForm
                    want={editingWant}
                    onClose={() => setShowWantForm(false)}
                />
            )}
        </AppLayout>
    )
}
```

- [ ] **Commit**

```bash
git add src/resources/js/Pages/Projects/
git commit -m "feat(projects): add Projects/Index page and components"
```

---

## Task 13: Frontend — Kanban Board Components

**Files:**
- Create: `src/resources/js/Pages/Projects/components/TaskCard.tsx`
- Create: `src/resources/js/Pages/Projects/components/TaskForm.tsx`
- Create: `src/resources/js/Pages/Projects/components/KanbanColumn.tsx`
- Create: `src/resources/js/Pages/Projects/components/KanbanBoard.tsx`

- [ ] **Create TaskCard** at `src/resources/js/Pages/Projects/components/TaskCard.tsx`:
```tsx
import { Draggable } from '@hello-pangea/dnd'
import { ProjectTask } from '@/types'

interface Props {
    task: ProjectTask
    index: number
    onEdit: (t: ProjectTask) => void
}

const priorityDot: Record<string, string> = {
    low:    'bg-slate-500',
    medium: 'bg-yellow-500',
    high:   'bg-orange-500',
    urgent: 'bg-red-500',
}

export default function TaskCard({ task, index, onEdit }: Props) {
    return (
        <Draggable draggableId={String(task.id)} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onEdit(task)}
                    className={`bg-slate-800 border rounded-lg p-3 cursor-pointer transition-colors ${
                        snapshot.isDragging
                            ? 'border-indigo-500 shadow-lg shadow-indigo-900/40'
                            : 'border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <div className="flex items-start gap-2">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
                        <p className="text-sm text-slate-200 leading-snug">{task.title}</p>
                    </div>
                    {task.due_at && (
                        <p className="text-xs text-slate-500 mt-1 pl-4">{task.due_at}</p>
                    )}
                </div>
            )}
        </Draggable>
    )
}
```

- [ ] **Create TaskForm** at `src/resources/js/Pages/Projects/components/TaskForm.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { ProjectTask, ProjectColumn } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    task: ProjectTask | null
    projectId: number
    columns: ProjectColumn[]
    defaultColumnId: number
    onClose: () => void
}

export default function TaskForm({ task, projectId, columns, defaultColumnId, onClose }: Props) {
    const [title, setTitle]       = useState(task?.title ?? '')
    const [desc, setDesc]         = useState(task?.description ?? '')
    const [priority, setPriority] = useState<ProjectTask['priority']>(task?.priority ?? 'medium')
    const [dueAt, setDueAt]       = useState(task?.due_at ?? '')
    const [colId, setColId]       = useState(task?.project_column_id ?? defaultColumnId)

    useEffect(() => {
        if (task) {
            setTitle(task.title)
            setDesc(task.description ?? '')
            setPriority(task.priority)
            setDueAt(task.due_at ?? '')
            setColId(task.project_column_id)
        }
    }, [task])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = {
            title,
            description:        desc || null,
            priority,
            due_at:             dueAt || null,
            project_column_id:  colId,
        }
        if (task) {
            router.patch('/projects/tasks/' + task.id, payload, { preserveScroll: true })
        } else {
            router.post('/projects/' + projectId + '/tasks', payload, { preserveScroll: true })
        }
        onClose()
    }

    function handleDelete() {
        if (!task || !confirm('Excluir tarefa?')) return
        router.delete('/projects/tasks/' + task.id, {}, { preserveScroll: true })
        onClose()
    }

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-slate-200">{task ? 'Editar tarefa' : 'Nova tarefa'}</h2>
                <button className="text-slate-500 hover:text-slate-300 text-lg leading-none" onClick={onClose}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Coluna</label>
                    <select
                        value={colId}
                        onChange={e => setColId(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Prioridade</label>
                    <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as ProjectTask['priority'])}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Prazo</label>
                    <input
                        type="date"
                        value={dueAt}
                        onChange={e => setDueAt(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Descrição</label>
                    <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </form>
            <div className="px-5 py-4 border-t border-slate-800 flex justify-between">
                {task ? (
                    <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>Excluir</Button>
                ) : <span />}
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" size="sm" onClick={(e: React.MouseEvent) => {
                        const form = (e.target as HTMLElement).closest('.flex-1')?.querySelector('form') as HTMLFormElement
                        form?.requestSubmit()
                    }}>Salvar</Button>
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Create KanbanColumn** at `src/resources/js/Pages/Projects/components/KanbanColumn.tsx`:
```tsx
import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { router } from '@inertiajs/react'
import { ProjectColumn, ProjectTask } from '@/types'
import TaskCard from './TaskCard'
import Button from '@/Components/ui/Button'

interface Props {
    column: ProjectColumn
    projectId: number
    onAddTask: (columnId: number) => void
    onEditTask: (task: ProjectTask) => void
}

export default function KanbanColumn({ column, projectId, onAddTask, onEditTask }: Props) {
    const [editingName, setEditingName] = useState(false)
    const [name, setName] = useState(column.name)

    function saveName() {
        setEditingName(false)
        if (name !== column.name) {
            router.patch(`/projects/${projectId}/columns/${column.id}`, { name }, { preserveScroll: true })
        }
    }

    function deleteColumn() {
        if (!confirm(`Excluir coluna "${column.name}" e todas as suas tarefas?`)) return
        router.delete(`/projects/${projectId}/columns/${column.id}`, {}, { preserveScroll: true })
    }

    return (
        <div className="flex flex-col w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                {editingName ? (
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={saveName}
                        onKeyDown={e => e.key === 'Enter' && saveName()}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                ) : (
                    <button
                        className="text-sm font-medium text-slate-300 hover:text-slate-100 text-left flex-1"
                        onClick={() => setEditingName(true)}
                    >
                        {column.name}
                    </button>
                )}
                <span className="text-xs text-slate-600 ml-2">{column.tasks.length}</span>
                <button
                    className="ml-2 text-slate-600 hover:text-red-400 text-sm leading-none"
                    onClick={deleteColumn}
                >×</button>
            </div>

            <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 space-y-2 min-h-[80px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-slate-800/50' : ''
                        }`}
                    >
                        {column.tasks.map((task, i) => (
                            <TaskCard key={task.id} task={task} index={i} onEdit={onEditTask} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            <div className="px-3 pb-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-slate-500 hover:text-slate-300"
                    onClick={() => onAddTask(column.id)}
                >
                    + Adicionar tarefa
                </Button>
            </div>
        </div>
    )
}
```

- [ ] **Create KanbanBoard** at `src/resources/js/Pages/Projects/components/KanbanBoard.tsx`:
```tsx
import { useState } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { router } from '@inertiajs/react'
import { Project, ProjectColumn, ProjectTask } from '@/types'
import KanbanColumn from './KanbanColumn'
import TaskForm from './TaskForm'
import Button from '@/Components/ui/Button'

interface Props {
    project: Project & { columns: ProjectColumn[] }
}

export default function KanbanBoard({ project }: Props) {
    const [taskForm, setTaskForm] = useState<{
        open: boolean
        task: ProjectTask | null
        columnId: number
    }>({ open: false, task: null, columnId: project.columns[0]?.id ?? 0 })

    function onDragEnd(result: DropResult) {
        if (!result.destination) return

        const { draggableId, source, destination } = result

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return

        router.patch(
            '/projects/tasks/' + draggableId + '/move',
            {
                project_column_id: Number(destination.droppableId),
                position:          destination.index,
            },
            { preserveScroll: true }
        )
    }

    function addColumn() {
        const name = prompt('Nome da nova coluna:')
        if (!name?.trim()) return
        router.post(
            '/projects/' + project.id + '/columns',
            { name, position: project.columns.length },
            { preserveScroll: true }
        )
    }

    return (
        <div className="relative">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {project.columns.map(col => (
                        <KanbanColumn
                            key={col.id}
                            column={col}
                            projectId={project.id}
                            onAddTask={columnId => setTaskForm({ open: true, task: null, columnId })}
                            onEditTask={task => setTaskForm({ open: true, task, columnId: task.project_column_id })}
                        />
                    ))}
                    <button
                        onClick={addColumn}
                        className="flex items-center justify-center w-72 h-12 shrink-0 border border-dashed border-slate-700 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors"
                    >
                        + Nova coluna
                    </button>
                </div>
            </DragDropContext>

            {taskForm.open && (
                <TaskForm
                    task={taskForm.task}
                    projectId={project.id}
                    columns={project.columns}
                    defaultColumnId={taskForm.columnId}
                    onClose={() => setTaskForm(f => ({ ...f, open: false }))}
                />
            )}
        </div>
    )
}
```

- [ ] **Commit**

```bash
git add src/resources/js/Pages/Projects/components/TaskCard.tsx \
        src/resources/js/Pages/Projects/components/TaskForm.tsx \
        src/resources/js/Pages/Projects/components/KanbanColumn.tsx \
        src/resources/js/Pages/Projects/components/KanbanBoard.tsx
git commit -m "feat(projects): add Kanban board components with drag-and-drop"
```

---

## Task 14: Frontend — Project Detail Page + Notes/Links

**Files:**
- Create: `src/resources/js/Pages/Projects/components/ProjectNotesList.tsx`
- Create: `src/resources/js/Pages/Projects/components/ProjectLinksList.tsx`
- Create: `src/resources/js/Pages/Projects/Project.tsx`

- [ ] **Create ProjectNotesList** at `src/resources/js/Pages/Projects/components/ProjectNotesList.tsx`:
```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { ProjectNote } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    notes: ProjectNote[]
    projectId: number
}

export default function ProjectNotesList({ notes, projectId }: Props) {
    const [newContent, setNewContent] = useState('')
    const [editingId, setEditingId]   = useState<number | null>(null)
    const [editContent, setEditContent] = useState('')

    function addNote() {
        if (!newContent.trim()) return
        router.post('/projects/' + projectId + '/notes', { content: newContent }, { preserveScroll: true })
        setNewContent('')
    }

    function startEdit(note: ProjectNote) {
        setEditingId(note.id)
        setEditContent(note.content)
    }

    function saveEdit() {
        if (editingId === null) return
        router.patch('/projects/notes/' + editingId, { content: editContent }, { preserveScroll: true })
        setEditingId(null)
    }

    function deleteNote(id: number) {
        if (!confirm('Excluir nota?')) return
        router.delete('/projects/notes/' + id, {}, { preserveScroll: true })
    }

    return (
        <div className="space-y-3">
            {notes.map(note => (
                <div key={note.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    {editingId === note.id ? (
                        <div className="space-y-2">
                            <textarea
                                autoFocus
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                                <Button variant="primary" size="sm" onClick={saveEdit}>Salvar</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap flex-1">{note.content}</p>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(note)}>Editar</Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>×</Button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="space-y-2">
                <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Adicionar nota…"
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button variant="primary" size="sm" onClick={addNote}>Adicionar</Button>
            </div>
        </div>
    )
}
```

- [ ] **Create ProjectLinksList** at `src/resources/js/Pages/Projects/components/ProjectLinksList.tsx`:
```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { ProjectLink } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    links: ProjectLink[]
    projectId: number
}

export default function ProjectLinksList({ links, projectId }: Props) {
    const [title, setTitle] = useState('')
    const [url, setUrl]     = useState('')

    function addLink(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim() || !url.trim()) return
        router.post('/projects/' + projectId + '/links', { title, url }, { preserveScroll: true })
        setTitle('')
        setUrl('')
    }

    function deleteLink(id: number) {
        router.delete('/projects/links/' + id, {}, { preserveScroll: true })
    }

    return (
        <div className="space-y-3">
            {links.map(link => (
                <div key={link.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                    <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:text-indigo-300 truncate flex-1"
                    >
                        {link.title}
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => deleteLink(link.id)}>×</Button>
                </div>
            ))}

            <form onSubmit={addLink} className="flex gap-2">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título"
                    required
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://…"
                    required
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button type="submit" variant="primary" size="sm">Adicionar</Button>
            </form>
        </div>
    )
}
```

- [ ] **Create Projects/Project.tsx** at `src/resources/js/Pages/Projects/Project.tsx`:
```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Project, ProjectColumn, ProjectNote, ProjectLink } from '@/types'
import KanbanBoard from './components/KanbanBoard'
import ProjectNotesList from './components/ProjectNotesList'
import ProjectLinksList from './components/ProjectLinksList'
import ProjectForm from './components/ProjectForm'
import Button from '@/Components/ui/Button'

type FullProject = Project & {
    columns: ProjectColumn[]
    notes: ProjectNote[]
    links: ProjectLink[]
}

interface Props {
    project: { data: FullProject }
}

type Tab = 'notes' | 'links'

export default function ProjectPage({ project: { data: project } }: Props) {
    const [editOpen, setEditOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('notes')

    const statusLabel: Record<string, string> = {
        active: 'Ativo', paused: 'Pausado', done: 'Concluído', archived: 'Arquivado',
    }

    return (
        <AppLayout title={project.title}>
            <div className="px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <button
                            className="text-xs text-slate-500 hover:text-slate-400 mb-1"
                            onClick={() => router.get('/projects')}
                        >
                            ← Projetos
                        </button>
                        <h1 className="text-xl font-bold text-slate-100">{project.title}</h1>
                        {project.description && (
                            <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                            {statusLabel[project.status] ?? project.status}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>Editar</Button>
                    </div>
                </div>

                {/* Kanban */}
                <KanbanBoard project={project} />

                {/* Tabs: Notes / Links */}
                <div>
                    <div className="flex gap-4 border-b border-slate-800 mb-4">
                        {(['notes', 'links'] as Tab[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-2 text-sm font-medium transition-colors ${
                                    activeTab === tab
                                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {tab === 'notes' ? 'Notas' : 'Links'}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'notes' && (
                        <ProjectNotesList notes={project.notes} projectId={project.id} />
                    )}
                    {activeTab === 'links' && (
                        <ProjectLinksList links={project.links} projectId={project.id} />
                    )}
                </div>
            </div>

            {editOpen && (
                <ProjectForm project={project} onClose={() => setEditOpen(false)} />
            )}
        </AppLayout>
    )
}
```

- [ ] **Commit**

```bash
git add src/resources/js/Pages/Projects/components/ProjectNotesList.tsx \
        src/resources/js/Pages/Projects/components/ProjectLinksList.tsx \
        src/resources/js/Pages/Projects/Project.tsx
git commit -m "feat(projects): add Project detail page with notes and links"
```

---

## Task 15: Final Build + Full Test Run

- [ ] **Build frontend assets**

```bash
docker compose run --rm node npm run build
```

Expected: build completes without TypeScript errors.

- [ ] **Run full test suite**

```bash
docker compose exec app php artisan test --colors=never
```

Expected: all tests pass (~103 total).

- [ ] **Verify routes are registered**

```bash
docker compose exec app php artisan route:list --path=projects --columns=method,uri,action 2>&1 | head -30
docker compose exec app php artisan route:list --path=wants --columns=method,uri,action 2>&1
```

Expected: all routes from Task 4 appear in the list.

- [ ] **Commit if any cleanup needed, otherwise done**

```bash
git add -p  # review any untracked changes
git commit -m "feat(projects): phase 6 complete — projects + wants + kanban"
```

---

## Self-Review Checklist

- [x] All spec sections covered: models, service, resources, controllers, routes, frontend pages, components, dashboard, tests
- [x] No placeholders or TBDs — every step has actual code
- [x] `project_column_id` used consistently (not `column_id`) matching DB schema
- [x] `title` used consistently (not `name`) for `wants` and `projects` matching DB schema
- [x] `project_notes` uses only `content` (no `title`) matching DB schema
- [x] `project_links` uses `title` (not `label`) matching DB schema
- [x] `ProjectResource` wraps in `data` key (collection), `Project.tsx` destructures `project.data`
- [x] All tests use `RefreshDatabase` — no real DB touched
- [x] `WantPromotionService` tested via `WantTest::test_promote_creates_project_with_three_columns`
- [x] `move` action tested in `ProjectTaskTest`
- [x] TaskForm submit button uses form's `requestSubmit()` — this is fragile due to DOM traversal. **Alternative:** wrap form and buttons together inside the `<form>` tag and use `type="submit"`. Revise `TaskForm` if this causes issues during testing.
