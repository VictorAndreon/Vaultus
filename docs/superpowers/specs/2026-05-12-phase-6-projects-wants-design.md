# Fase 6 — Projetos + Vontades

**Data:** 2026-05-12
**Status:** Aprovado

## Objetivo

Implementar o módulo de projetos pessoais com kanban próprio (colunas + cards drag-and-drop) e uma lista de vontades (backlog de ideias) que podem ser promovidas a projetos. Timer de tarefas fora do escopo desta fase.

---

## Decisões de Design

| Decisão | Escolha |
|---|---|
| Navegação | `/projects` lista + `/projects/{id}` detalhe — mesmo padrão do Finance |
| Vontades | Lista de ideias futuras na página `/projects`; promoção cria projeto e preenche `want_id` |
| Drag-and-drop | `@hello-pangea/dnd` (fork mantido do react-beautiful-dnd) |
| Timer de tarefas | Fora do escopo (sem `project_task_timers` nesta fase) |
| Arquivos e métricas | Fora do escopo (YAGNI) |
| Banco | Todas as migrations já existem da Fase 0 — nenhuma migration nova necessária |

---

## Banco de Dados

Nenhuma migration nova. Tabelas já existentes da Fase 0: `wants`, `projects`, `project_columns`, `project_tasks`, `project_notes`, `project_links`.

Tabelas **fora do escopo desta fase**: `project_task_timers`, `project_files`, `project_metrics`.

### Schema relevante

**`wants`**
```sql
user_id       BIGINT NOT NULL REFERENCES users(id)
name          VARCHAR(255) NOT NULL
description   TEXT NULLABLE
category      VARCHAR(100) NULLABLE
priority      VARCHAR(10) DEFAULT 'medium'     -- low|medium|high
promoted_at   TIMESTAMP NULLABLE               -- preenchido ao promover para projeto
deleted_at    TIMESTAMP NULLABLE               -- soft delete
```

**`projects`**
```sql
user_id       BIGINT NOT NULL REFERENCES users(id)
want_id       BIGINT NULLABLE REFERENCES wants(id) ON DELETE SET NULL
name          VARCHAR(255) NOT NULL
description   TEXT NULLABLE
status        VARCHAR(10) DEFAULT 'active'     -- active|paused|done|archived
deleted_at    TIMESTAMP NULLABLE
```

**`project_columns`**
```sql
project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
name          VARCHAR(255) NOT NULL
position      INTEGER NOT NULL DEFAULT 0
```

**`project_tasks`**
```sql
project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
column_id     BIGINT NOT NULL REFERENCES project_columns(id) ON DELETE CASCADE
title         VARCHAR(255) NOT NULL
description   TEXT NULLABLE
position      INTEGER NOT NULL DEFAULT 0
priority      VARCHAR(10) DEFAULT 'medium'     -- low|medium|high|urgent
due_at        TIMESTAMP NULLABLE
deleted_at    TIMESTAMP NULLABLE
```

**`project_notes`**
```sql
project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
title         VARCHAR(255) NOT NULL
content       TEXT NULLABLE
```

**`project_links`**
```sql
project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
label         VARCHAR(255) NOT NULL
url           TEXT NOT NULL
```

---

## Models

### `Want` — `app/Domains/Projects/Models/Want.php`
- `fillable`: `name`, `description`, `category`, `priority`
- Cast: `promoted_at → datetime`
- Relações: `belongsTo(User)`, `hasOne(Project)`
- Scope `unpromoted()`: filtra `promoted_at IS NULL`
- Soft deletes: sim

### `Project` — `app/Domains/Projects/Models/Project.php`
- `fillable`: `name`, `description`, `status`, `want_id`
- Relações: `belongsTo(User)`, `belongsTo(Want)` (nullable), `hasMany(ProjectColumn)`, `hasMany(ProjectNote)`, `hasMany(ProjectLink)`
- Soft deletes: sim

### `ProjectColumn` — `app/Domains/Projects/Models/ProjectColumn.php`
- `fillable`: `name`, `position`
- Relações: `belongsTo(Project)`, `hasMany(ProjectTask)`

### `ProjectTask` — `app/Domains/Projects/Models/ProjectTask.php`
- `fillable`: `title`, `description`, `position`, `priority`, `due_at`, `column_id`
- Cast: `due_at → datetime`
- Relações: `belongsTo(Project)`, `belongsTo(ProjectColumn)`
- Soft deletes: sim

### `ProjectNote` — `app/Domains/Projects/Models/ProjectNote.php`
- `fillable`: `title`, `content`
- Relação: `belongsTo(Project)`

### `ProjectLink` — `app/Domains/Projects/Models/ProjectLink.php`
- `fillable`: `label`, `url`
- Relação: `belongsTo(Project)`

---

## WantPromotionService

`app/Domains/Projects/Services/WantPromotionService.php`

```php
public function promote(Want $want): Project
```

1. Cria um `Project` com `name = $want->name`, `description = $want->description`, `want_id = $want->id`
2. Cria três colunas padrão: "A fazer" (pos 0), "Em progresso" (pos 1), "Concluído" (pos 2)
3. Preenche `$want->promoted_at = now()` e salva
4. Retorna o projeto criado

---

## Controllers e Rotas

### Rotas

```php
// Projects
Route::get('/projects', [ProjectController::class, 'index'])->name('projects');
Route::post('/projects', [ProjectController::class, 'store']);
Route::get('/projects/{project}', [ProjectController::class, 'show']);
Route::patch('/projects/{project}', [ProjectController::class, 'update']);
Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

// Wants — /wants/... DEVE vir antes de /wants/{want}
Route::post('/wants', [WantController::class, 'store']);
Route::patch('/wants/{want}', [WantController::class, 'update']);
Route::delete('/wants/{want}', [WantController::class, 'destroy']);
Route::post('/wants/{want}/promote', [WantController::class, 'promote']);

// Project Columns
Route::post('/projects/{project}/columns', [ProjectColumnController::class, 'store']);
Route::patch('/projects/{project}/columns/{column}', [ProjectColumnController::class, 'update']);
Route::delete('/projects/{project}/columns/{column}', [ProjectColumnController::class, 'destroy']);

// Project Tasks
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

### Controllers

| Controller | Responsabilidade |
|---|---|
| `ProjectController` | `index` (lista + wants), `show` (kanban + notas + links), `store`, `update`, `destroy` |
| `WantController` | `store`, `update`, `destroy`, `promote` (delega ao WantPromotionService) |
| `ProjectColumnController` | `store`, `update`, `destroy` |
| `ProjectTaskController` | `store`, `update`, `destroy`, `move` |
| `ProjectNoteController` | `store`, `update`, `destroy` |
| `ProjectLinkController` | `store`, `destroy` |

### Props do `ProjectController::index`

```php
[
    'projects' => ProjectResource::collection(
        $user->projects()->withCount('tasks')->latest()->get()
    ),
    'wants' => WantResource::collection(
        $user->wants()->unpromoted()->orderByDesc('priority')->latest()->get()
    ),
]
```

### Props do `ProjectController::show`

```php
[
    'project' => ProjectResource::make($project->load(['columns.tasks', 'notes', 'links'])),
]
```

### `ProjectTaskController::move`

Recebe `column_id` e `position`. Reposiciona a task:
1. Move a task para `column_id`
2. Recalcula `position` de todas as tasks da coluna destino em ordem

### Autorização

`abort_if($resource->user_id !== auth()->id(), 403)` ou `abort_if($resource->project->user_id !== auth()->id(), 403)` em todos os controllers. Sistema single-user — sem Policy formal.

---

## Resources

| Resource | Campos expostos |
|---|---|
| `ProjectResource` | `id`, `name`, `description`, `status`, `want_id`, `tasks_count` (whenCounted), `columns` (whenLoaded), `notes` (whenLoaded), `links` (whenLoaded) |
| `WantResource` | `id`, `name`, `description`, `category`, `priority`, `promoted_at` |
| `ProjectColumnResource` | `id`, `name`, `position`, `tasks` (whenLoaded) |
| `ProjectTaskResource` | `id`, `title`, `description`, `position`, `priority`, `due_at`, `column_id` |
| `ProjectNoteResource` | `id`, `title`, `content` |
| `ProjectLinkResource` | `id`, `label`, `url` |

---

## Frontend

### Estrutura de Arquivos

```
resources/js/Pages/Projects/
├── Index.tsx
├── Project.tsx
└── components/
    ├── ProjectCard.tsx
    ├── ProjectForm.tsx
    ├── WantCard.tsx
    ├── WantForm.tsx
    ├── KanbanBoard.tsx
    ├── KanbanColumn.tsx
    ├── TaskCard.tsx
    ├── TaskForm.tsx
    ├── ProjectNotesList.tsx
    └── ProjectLinksList.tsx
```

### `Index.tsx`
- Props: `projects`, `wants`
- Seção superior: grade de `ProjectCard`; botão "Novo Projeto"
- Seção inferior colapsável "Vontades": lista de `WantCard`; botão "Nova Vontade"
- Estado local: `projectFormOpen`, `wantFormOpen`, `editingProject`, `editingWant`

### `Project.tsx`
- Props: `project` (com `columns.tasks`, `notes`, `links`)
- Header: nome do projeto, badge de status, botão editar, link "← Projetos"
- Corpo: `KanbanBoard` ocupando largura total
- Abas abaixo do kanban: "Notas" (`ProjectNotesList`) e "Links" (`ProjectLinksList`)
- Estado local: `taskFormOpen`, `editingTask`, `activeTab`

### `KanbanBoard.tsx`
- `DragDropContext` do `@hello-pangea/dnd`
- `onDragEnd`: ao soltar, chama `router.patch('/projects/tasks/{id}/move', { column_id, position }, { preserveScroll: true })`
- Renderiza `KanbanColumn` para cada coluna, ordenadas por `position`
- Botão "+" para adicionar coluna

### `KanbanColumn.tsx`
- `Droppable` por coluna
- Header com nome editável inline + botão deletar coluna
- Lista de `TaskCard` (Draggable)
- Botão "Adicionar tarefa" no rodapé

### `TaskCard.tsx`
- `Draggable`
- Exibe: título, badge de prioridade (colorido), `due_at` formatado se presente
- Click abre `TaskForm` em modo edição

### `TaskForm.tsx`
- Drawer lateral (mesmo padrão do `HabitDrawer`)
- Campos: título, descrição (textarea), prioridade, due_at
- Submit via `router.post` (criar) ou `router.patch` (editar) com `preserveScroll: true`

### `WantCard.tsx`
- Exibe nome, categoria, badge de prioridade
- Botão "Promover para Projeto" → `router.post('/wants/{id}/promote')` → redireciona para `/projects/{novo_id}`

### Dependência npm a instalar

```bash
npm install @hello-pangea/dnd
```

`@hello-pangea/dnd` inclui tipos TypeScript nativamente — nenhum pacote `@types` adicional necessário.

---

## Tipos TypeScript

Adicionar em `resources/js/types/index.d.ts`:

```typescript
export interface Want {
    id: number
    name: string
    description: string | null
    category: string | null
    priority: 'low' | 'medium' | 'high'
    promoted_at: string | null
}

export interface Project {
    id: number
    name: string
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
    title: string
    description: string | null
    position: number
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_at: string | null
    column_id: number
}

export interface ProjectNote {
    id: number
    title: string
    content: string | null
}

export interface ProjectLink {
    id: number
    label: string
    url: string
}
```

---

## Dashboard

`DashboardAggregator::getStats()` ganha:
```php
'active_projects' => $user->projects()->where('status', 'active')->count(),
'wants_count'     => $user->wants()->whereNull('promoted_at')->count(),
```

`QuickStats.tsx` exibe card "Projetos ativos" com link para `/projects`.

---

## Testes

Todos os testes usam `RefreshDatabase` e rodam contra `vaultus_test` (configurado em `phpunit.xml`).

| Arquivo | Casos |
|---|---|
| `ProjectTest.php` | requer auth, renderiza props, create, update, delete, não acessa projeto de outro usuário |
| `WantTest.php` | create, update, delete, promote (cria projeto + 3 colunas + preenche promoted_at), não acessa vontade de outro usuário |
| `ProjectColumnTest.php` | create, update, delete, não modifica coluna de outro usuário |
| `ProjectTaskTest.php` | create, update, delete, move (muda coluna + reposiciona), não modifica task de outro usuário |
| `ProjectNoteTest.php` | create, update, delete |
| `ProjectLinkTest.php` | create, delete |

~30 testes no total.

---

## Segurança

- `abort_if` em todos os controllers verificando `user_id`
- `Rule::in(['low', 'medium', 'high'])` na validação de `priority` em `WantController` e `ProjectTaskController`
- `Rule::in(['active', 'paused', 'done', 'archived'])` em `ProjectController`
- `Rule::in(['low', 'medium', 'high', 'urgent'])` em `ProjectTaskController`

---

## Mapa de Arquivos

### Criar

| Arquivo | Responsabilidade |
|---|---|
| `app/Domains/Projects/Models/Want.php` | Model com scope `unpromoted` |
| `app/Domains/Projects/Models/Project.php` | Model com relações |
| `app/Domains/Projects/Models/ProjectColumn.php` | Model |
| `app/Domains/Projects/Models/ProjectTask.php` | Model com soft delete |
| `app/Domains/Projects/Models/ProjectNote.php` | Model |
| `app/Domains/Projects/Models/ProjectLink.php` | Model |
| `app/Domains/Projects/Services/WantPromotionService.php` | Cria projeto + 3 colunas + preenche promoted_at |
| `app/Domains/Projects/Controllers/ProjectController.php` | index, show, store, update, destroy |
| `app/Domains/Projects/Controllers/WantController.php` | store, update, destroy, promote |
| `app/Domains/Projects/Controllers/ProjectColumnController.php` | store, update, destroy |
| `app/Domains/Projects/Controllers/ProjectTaskController.php` | store, update, destroy, move |
| `app/Domains/Projects/Controllers/ProjectNoteController.php` | store, update, destroy |
| `app/Domains/Projects/Controllers/ProjectLinkController.php` | store, destroy |
| `app/Http/Resources/ProjectResource.php` | serialização |
| `app/Http/Resources/WantResource.php` | serialização |
| `app/Http/Resources/ProjectColumnResource.php` | serialização |
| `app/Http/Resources/ProjectTaskResource.php` | serialização |
| `app/Http/Resources/ProjectNoteResource.php` | serialização |
| `app/Http/Resources/ProjectLinkResource.php` | serialização |
| `tests/Feature/Projects/ProjectTest.php` | feature tests projetos |
| `tests/Feature/Projects/WantTest.php` | feature tests vontades |
| `tests/Feature/Projects/ProjectColumnTest.php` | feature tests colunas |
| `tests/Feature/Projects/ProjectTaskTest.php` | feature tests tarefas |
| `tests/Feature/Projects/ProjectNoteTest.php` | feature tests notas |
| `tests/Feature/Projects/ProjectLinkTest.php` | feature tests links |
| `resources/js/Pages/Projects/Index.tsx` | lista projetos + vontades |
| `resources/js/Pages/Projects/Project.tsx` | detalhe + kanban |
| `resources/js/Pages/Projects/components/ProjectCard.tsx` | card de projeto |
| `resources/js/Pages/Projects/components/ProjectForm.tsx` | modal CRUD projeto |
| `resources/js/Pages/Projects/components/WantCard.tsx` | card de vontade |
| `resources/js/Pages/Projects/components/WantForm.tsx` | modal CRUD vontade |
| `resources/js/Pages/Projects/components/KanbanBoard.tsx` | DragDropContext |
| `resources/js/Pages/Projects/components/KanbanColumn.tsx` | Droppable |
| `resources/js/Pages/Projects/components/TaskCard.tsx` | Draggable |
| `resources/js/Pages/Projects/components/TaskForm.tsx` | drawer criar/editar tarefa |
| `resources/js/Pages/Projects/components/ProjectNotesList.tsx` | lista notas |
| `resources/js/Pages/Projects/components/ProjectLinksList.tsx` | lista links |

### Modificar

| Arquivo | O que muda |
|---|---|
| `routes/web.php` | Remover `projects` dos stubs, adicionar ~20 rotas reais |
| `app/Domains/Auth/Models/User.php` | Adicionar `projects()`, `wants()` |
| `app/Domains/Dashboard/Services/DashboardAggregator.php` | Adicionar `active_projects`, `wants_count` |
| `resources/js/Pages/Dashboard/widgets/QuickStats.tsx` | Exibir projetos ativos |
| `resources/js/types/index.d.ts` | Adicionar tipos `Want`, `Project`, `ProjectColumn`, `ProjectTask`, `ProjectNote`, `ProjectLink` |
