# Conclusão de tarefas unificada + barra de progresso dos projetos

**Data:** 2026-06-03
**Domínio:** Projects (+ Tasks, Dashboard)
**Status:** Aprovado (aguardando revisão da spec)

## Problema

No `ProjectCard` (lista de projetos em `/projects`), a barra `.meter` que aparece
entre a descrição e a contagem de tarefas está com o preenchimento **fixo em `0%`**
(`<span style={{ width: '0%' }} />`). Visualmente parece um divisor, mas é uma
**barra de progresso morta** — deveria refletir o percentual de tarefas concluídas
do projeto.

Além disso, a regra de "tarefa concluída" está **duplicada em 3 lugares** e o
check-in na Tela de Tarefas (`/tasks`) hoje só alterna `completed_at`, sem refletir
no Kanban do projeto.

## Objetivo

1. A barra do card reflete o **percentual de tarefas concluídas**.
2. Unificar a definição de "tarefa concluída".
3. Check-in (Tela de Tarefas) marca a tarefa **e** a move para a coluna "Concluído".
4. Sincronia **bidirecional** entre check-in e coluna do Kanban.

## Definição de "concluída"

Uma tarefa é considerada concluída quando:

```
completed_at != null  OU  a coluna contém "done"/"conclu" no nome (case-insensitive)
```

- **Leitura tolerante:** mantém o `OR` por robustez/retrocompatibilidade (tarefas
  legadas já numa coluna "Concluído" sem `completed_at` continuam contando).
- **Escrita consistente:** `completed_at` é a fonte da verdade; as escritas
  (check-in e arrastar) mantêm `completed_at` e coluna em sincronia, de modo que
  os dois sinais convergem ao longo do tempo.

## Componentes

### 1. Centralizar a lógica (remove duplicação)

Hoje a regra está repetida em `DashboardAggregator::isDoneColumn`, na closure
`$isDone` do `TasksController` e (implicitamente) faltaria no `ProjectController`.
Consolidar em métodos de modelo:

- `App\Domains\Projects\Models\ProjectColumn`
  - `public static function nameIsDone(?string $name): bool` — `$name` contém
    `done` ou `conclu` (lowercase). Null → false.
  - `public function isDoneColumn(): bool` — delega para `nameIsDone($this->name)`.
- `App\Domains\Projects\Models\ProjectTask`
  - `public function isDone(): bool` — `$this->completed_at !== null || $this->column?->isDoneColumn()`.

Refatorar `DashboardAggregator::getActiveProjects` / `getStats` e
`TasksController::index` para usarem `ProjectTask::isDone()` e
`ProjectColumn::nameIsDone()`. Comportamento observável idêntico ao atual.

### 2. Progresso no projeto

- `App\Domains\Projects\Models\Project`
  - `public function tasksDoneCount(): int` — conta `$this->tasks` (com `column`
    carregada) onde `isDone()` é true.
  - `public function progressPercent(): int` — `total > 0 ? round(done/total*100) : 0`.
    Ambos operam sobre a relação `tasks` **já carregada** (com `column`), sem
    novas queries.
- `ProjectController::index`: trocar `->withCount('tasks')` por
  `->with('tasks.column')->get()` (carga aceitável para um app pessoal).
- `App\Http\Resources\ProjectResource`: expor quando `tasks` estiver carregada:
  - `progress_percent` → `$this->progressPercent()`
  - `tasks_done` → `$this->tasksDoneCount()`
  - `tasks_total` → `$this->tasks->count()` (mantém `tasks_count` via `whenCounted`
    para compatibilidade onde já é usado).

### 3. Check-in bidirecional — `ProjectTaskController::toggleDone`

Reescrever de toggle simples para:

- **Marcar** (`completed_at` estava null → vira `now()`):
  - Encontrar a coluna "Concluído" do projeto (primeira por `position` com
    `nameIsDone`). Se **não existir**, criar `['name' => 'Concluído', 'position' => <max+1>]`.
  - Mover a tarefa para essa coluna (append no fim: `position` = nº de tarefas na coluna).
- **Desmarcar** (`completed_at` estava setado → vira `null`):
  - Se a tarefa está numa coluna-Concluído, movê-la para a **última coluna
    não-concluída** (maior `position` com `nameIsDone == false`), append no fim.
  - Se não houver coluna não-concluída (borda quase impossível: projeto só com
    coluna "Concluído"), apenas limpa `completed_at` e mantém a posição. Nesse
    caso a tarefa ainda contará como concluída pela regra de coluna — documentado
    e aceitável.
- Extrair helper privado
  `placeTaskInColumn(ProjectTask $task, int $columnId, ?int $position = null): void`
  (troca a coluna e renormaliza `position` dos irmãos; `position = null` → append no
  fim). Reaproveitado por `toggleDone` (sempre append, `null`) e por `move` (posição
  vinda do drag). A sincronia de `completed_at` fica **fora** do helper (só `move` e
  `toggleDone` decidem isso), para o helper ter uma única responsabilidade: posicionar.
- **Retorno:** passar de `noContent()` (204) para `back()`, para a Tela de Tarefas
  reagrupar a tarefa em "Concluídas hoje" e refletir o estado sem reload manual.
  A atualização otimista no front (`Tasks/Index.tsx`) permanece como feedback
  imediato; o `back()` corrige o agrupamento.

### 4. Sincronia ao arrastar — `ProjectTaskController::move`

Após mover a tarefa para a coluna de destino, sincronizar `completed_at`:

- Destino é coluna-Concluído **e** `completed_at` é null → setar `now()`.
- Destino **não** é coluna-Concluído **e** `completed_at` setado → limpar (`null`).

Sem mudança no frontend do Kanban (`KanbanBoard.onDragEnd` já chama `/move` com
`preserveScroll`).

### 5. Frontend

- `resources/js/Pages/Projects/components/ProjectCard.tsx`:
  - Barra: `<span style={{ width: \`${project.progress_percent ?? 0}%\` }} />`.
  - Rodapé: `{tasks_done}/{tasks_total} tarefas` (mantém o estilo `.mono` no número).
- `resources/js/types/index.d.ts`: adicionar ao `interface Project`:
  - `progress_percent?: number`
  - `tasks_done?: number`
  - `tasks_total?: number`

## Fluxo de dados

```
Check-in (Tela de Tarefas)
  └─ PATCH /projects/tasks/{id}/toggle-done
       └─ toggleDone(): completed_at = now()  +  placeTaskInColumn(coluna "Concluído" | cria)
            └─ back() → TasksController::index recomputa group via ProjectTask::isDone()

Arrastar no Kanban
  └─ PATCH /projects/tasks/{id}/move
       └─ move(): troca coluna + renormaliza posições + sincroniza completed_at

Lista de projetos (/projects)
  └─ ProjectController::index → with('tasks.column')
       └─ ProjectResource: progress_percent = round(done/total*100)
            └─ ProjectCard: largura da barra .meter
```

## Tratamento de erros / bordas

- `toggleDone` e `move` mantêm `abort_if($task->project->user_id !== auth, 403)`.
- Projeto sem nenhuma coluna + marcar: a coluna "Concluído" é criada antes de mover.
- Projeto só com coluna "Concluído" + desmarcar: limpa `completed_at`, sem mover
  (regra de coluna ainda vale; borda documentada).
- Múltiplas colunas-Concluído: marcar usa a primeira por `position`; desmarcar usa
  a maior `position` não-concluída como destino.
- `progressPercent` com 0 tarefas → 0% (sem divisão por zero).

## Testes (PHPUnit, `RefreshDatabase`, factories)

- `toggleDone` marca: seta `completed_at` e move para coluna "Concluído" existente.
- `toggleDone` marca sem coluna "Concluído": **cria** a coluna e move pra lá.
- `toggleDone` desmarca: limpa `completed_at` e move para a última coluna
  não-concluída.
- `move` para coluna-Concluído: seta `completed_at`.
- `move` para fora de coluna-Concluído: limpa `completed_at`.
- `ProjectController::index` (`assertInertia`): `progress_percent`/`tasks_done`
  corretos — incluindo concluída por coluna **e** por `completed_at`, e projeto
  com 0 tarefas → 0%.
- Padrões existentes: `actingAs($user)`, factories, `assertInertia`.

## Arquivos

**Backend**
- `app/Domains/Projects/Models/ProjectColumn.php`
- `app/Domains/Projects/Models/ProjectTask.php`
- `app/Domains/Projects/Models/Project.php`
- `app/Domains/Projects/Controllers/ProjectTaskController.php`
- `app/Domains/Projects/Controllers/ProjectController.php`
- `app/Http/Resources/ProjectResource.php`
- `app/Domains/Dashboard/Services/DashboardAggregator.php`
- `app/Domains/Tasks/Controllers/TasksController.php`
- Testes em `tests/Feature/Projects/` (novos)

**Frontend**
- `resources/js/Pages/Projects/components/ProjectCard.tsx`
- `resources/js/types/index.d.ts`

## Fora de escopo (YAGNI)

- Barra de progresso no cabeçalho da tela do projeto (`Project.tsx`) — pode ser
  adicionada depois reusando `progress_percent`.
- Reordenação manual de posição dentro da coluna "Concluído".
- Histórico/auditoria de conclusão.
