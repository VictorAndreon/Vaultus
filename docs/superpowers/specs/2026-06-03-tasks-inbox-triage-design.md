# Design — Fluxo de Tarefas: Inbox/Triagem + aba Por Projeto

**Data:** 2026-06-03
**Domínio:** Tasks / Projects
**Origem:** 4 itens reportados pelo usuário na tela de Tarefas (3 bugs + 1 feature).

## Contexto e diagnóstico

A tela de Tarefas (`Tasks/Index.tsx` + `TasksController@index`) hoje promete um fluxo
GTD que nunca foi ligado ao backend:

- **`ProjectTask` não tem "status".** O "status" de uma tarefa é a **coluna do kanban**
  (`project_column_id`) somada a `completed_at`. Não existe enum de status.
- O **"Inbox"** é só uma lista derivada de tarefas **sem prazo** (`due_at === null && !isDone`).
- O botão **"Processar"** é um `<a>` morto (sem `onClick`/`href`).
- A aba **"Por Projeto"** não existe — há só um card lateral somente-leitura com contagens.

Mapeamento dos itens reportados:

| Item | Diagnóstico | Onde |
|------|-------------|------|
| Bug "checkbox abre tela em branco" | `toggleDone` retornava `204 noContent`; o Inertia renderiza resposta não-Inertia como modal em branco. **JÁ CORRIGIDO** no branch `feat/project-task-completion` (passou a retornar `back()`), com teste de regressão (`assertRedirect`). | — |
| Bug "Processar não dá feedback" | Link morto, nunca implementado. | Parte A |
| Bug "status não remove da inbox" | Inbox atrelado a `due_at === null`, não a "já triada". | Parte A |
| Feat "aba Por Projeto multi-filtro + colunas" | Funcionalidade nova. | Parte B |

## Decisões de produto (confirmadas com o usuário)

1. **Sair do Inbox = ser triada**, via um **marcador explícito** na tarefa — não derivado
   da coluna. Uma tarefa em "A Fazer" com prazo/prioridade definidos **já saiu do Inbox**.
2. **Painel "Processar"** ajusta **prazo, prioridade e coluna** (no projeto atual) e confirma
   a triagem. Não reatribui projeto.
3. **Entrada no Inbox** via **captura rápida** (só título + projeto), criada na 1ª coluna como
   não-triada. O modal "Nova tarefa" completo cria a tarefa **já triada** (pula o Inbox).
4. **Aba "Por Projeto"**: filtro multi-seleção de projetos; cada projeto vira um módulo com
   suas **colunas reais** do kanban (sem normalizar), com cor por projeto. **Somente leitura**
   nesta primeira versão.

## Princípio central

> Uma tarefa está no **Inbox** ⟺ `triaged_at IS NULL` **E** `!isDone()`.

`isDone()` já existe (`completed_at != null` OU coluna "done"). O novo eixo é `triaged_at`.

---

## Parte A — Inbox / Triagem

### A.1 Modelo de dados

- Migração `add_triaged_at_to_project_tasks`: coluna `triaged_at TIMESTAMP NULL` após `completed_at`.
- **Backfill no mesmo `up()`:** marcar todas as linhas existentes como triadas para o Inbox
  nascer vazio:
  ```sql
  UPDATE project_tasks SET triaged_at = COALESCE(completed_at, created_at)
  ```
- `down()`: `dropColumn('triaged_at')`.
- `ProjectTask`:
  - `triaged_at` em `$fillable`; cast `'triaged_at' => 'datetime'`.
  - `public function isTriaged(): bool { return $this->triaged_at !== null; }`
  - (Inbox é consultado por query/escopo, não precisa de helper de instância para o filtro.)

### A.2 Gatilhos que setam `triaged_at`

| Ação | Efeito em `triaged_at` |
|------|------------------------|
| Captura rápida (`capture`) | permanece `null` (entra no Inbox) |
| `store` (modal "Nova tarefa") | `now()` (cria já triada) |
| `triage` (Processar) | `now()` (+ aplica prazo/prioridade/coluna) |
| `move` p/ coluna ≠ 1ª coluna do projeto | `now()` se ainda `null` |
| `toggleDone` ao **marcar** concluída | `now()` se ainda `null` |

Regra do `move`: "1ª coluna" = coluna do projeto com menor `position`. Mover para qualquer
outra coluna conta como engajar com a tarefa → triagem automática. Mover *de volta* para a 1ª
coluna **não** desfaz a triagem (uma vez triada, sempre triada).

Racional do `toggleDone`: concluir uma tarefa do Inbox e depois desmarcá-la **não** deve
ressuscitá-la no Inbox; por isso a conclusão também triagia.

### A.3 Captura rápida

- UI: campo no topo do card **Inbox** com `<input>` de título + `<select>` de projeto + Enter
  (ou botão). Sem prazo/prioridade — é captura.
- Rota: `POST /tasks/capture` → `ProjectTaskController@capture` (cross-project, então `project_id`
  vai no corpo; fica nesse controller junto de `store`). Payload: `{ title: string, project_id: int }`.
- Comportamento: valida que o projeto é do usuário e tem ≥1 coluna; cria a tarefa na **1ª
  coluna** (menor `position`), `priority = 'medium'`, `position` no fim da coluna,
  `triaged_at = null`. Retorna `back()`.

### A.4 Processar (triagem rápida)

- UI: cada item do Inbox tem um botão "Processar" que abre `TriageModal` para aquela tarefa.
- Rota: `PATCH /projects/tasks/{task}/triage` → `ProjectTaskController@triage`.
  Payload (todos opcionais exceto a confirmação): `{ due_at?: date|null, priority?: enum,
  project_column_id?: int }`.
- Comportamento (transacional):
  - autoriza (dono do projeto da tarefa);
  - valida `project_column_id` (se enviado) com `Rule::exists('project_columns','id')->where('project_id', $task->project_id)`;
  - aplica `due_at`/`priority` se enviados;
  - se `project_column_id` enviado e diferente do atual → `placeTaskInColumn($task, $columnId)`;
  - seta `triaged_at = now()`;
  - retorna `back()`.

### A.5 Inbox na página de Tarefas

- `TasksController@index`:
  - **Inbox** = tarefas do usuário com `triaged_at IS NULL` e `!isDone()`. Expor lista
    (`id`, `title`, `project_name`, `priority`, `project_id`) e contagem.
  - O card "Inbox · N" usa a contagem de não-triadas (não mais `no_due`).
  - A stat "Sem prazo" continua existindo como métrica separada (mantém `no_due`).
  - Para o `TriageModal`, expor as colunas de cada projeto (já há `projects` com `columns`
    para o modal de criação — reaproveitar).
- `InboxPanel.tsx`: captura rápida + lista de não-triadas; cada item com botão "Processar".

---

## Parte B — Aba "Por Projeto"

### B.1 Estrutura

- A página Tarefas ganha um switch de abas **"Lista" | "Por Projeto"** (estado local).
- **Lista** = a visão agrupada atual (Hoje/Esta semana/Mais tarde/Concluídas hoje) + stats +
  aside (Inbox, Por projeto resumo, Atalho). Extraída para `TaskListView.tsx`.
- **Por Projeto** (`ProjectBoardView.tsx`):
  - Barra de filtro multi-seleção (chips) dos projetos ativos/pausados. Default: **todos
    selecionados**. Estado local (não persiste entre navegações nesta versão).
  - Um **módulo por projeto selecionado**: cabeçalho com título + bolinha de cor (paleta
    `PROJECT_COLORS` por índice de projeto) e uma linha horizontal com as **colunas reais** do
    kanban daquele projeto (ordenadas por `position`), cada coluna listando suas tarefas.
  - Tarefas concluídas com risco/estilo apagado (reusa o padrão da Lista).
  - **Somente leitura**: sem drag. O checkbox de concluir reusa `PATCH .../toggle-done`
    (mesmo handler otimista da Lista). Clicar na tarefa não abre detalhe (fora de escopo).

### B.2 Dados

- `TasksController@index` expõe `projects_board`: projetos do usuário em `['active','paused']`
  com `columns` (id, name, position, ordenadas) e, em cada coluna, suas `tasks`
  (id, title, priority, is_done). Carregar via `with('columns.tasks')`.

---

## Estrutura de arquivos (frontend)

`Tasks/Index.tsx` (hoje ~185 linhas) vira orquestrador de abas e props. Quebrar em:

- `Pages/Tasks/Index.tsx` — orquestra abas + recebe props.
- `Pages/Tasks/components/TaskListView.tsx` — lista agrupada + stats + aside.
- `Pages/Tasks/components/InboxPanel.tsx` — captura rápida + lista não-triada + botões Processar.
- `Pages/Tasks/components/TriageModal.tsx` — painel Processar.
- `Pages/Tasks/components/ProjectBoardView.tsx` — aba Por Projeto (filtro + módulos).

Tipos novos no escopo da página (ou `types/index.d.ts` se compartilhados): item de Inbox,
`projects_board`.

## Backend — resumo de mudanças

- Migração `add_triaged_at_to_project_tasks` (+ backfill).
- `ProjectTask`: `triaged_at` fillable/cast + `isTriaged()`.
- `ProjectTaskController`: `store` seta `triaged_at`; novos `capture` e `triage`; `move` e
  `toggleDone` com auto-triage.
- `TasksController@index`: Inbox por não-triadas + `projects_board`.
- Rotas: `POST /tasks/capture`, `PATCH /projects/tasks/{task}/triage`.
  ⚠️ Ordem de rotas em `web.php`: declarar caminhos estáticos antes de `{param}` quando aplicável.

## Testes (PHPUnit, RefreshDatabase, sem factories p/ Project/Column/Task)

Parte A:
- captura rápida cria tarefa **não-triada** na 1ª coluna.
- `store` (modal completo) cria tarefa **triada**.
- `triage` seta `triaged_at` + aplica prazo/prioridade/coluna; valida coluna do próprio projeto.
- `move` para coluna ≠ 1ª → auto-triagia; `move` de volta p/ 1ª **não** desfaz.
- `toggleDone` ao marcar concluída seta `triaged_at`.
- `index`: Inbox lista só não-triadas e não-concluídas; contagem coerente.

Parte B:
- `index` expõe `projects_board` com colunas ordenadas e tarefas (incluindo `is_done`),
  apenas de projetos `active`/`paused` do usuário.

Frontend: sem suíte automatizada — verificação por `tsc --noEmit ... --ignoreDeprecations 6.0`.

## Sequência / branch

1. `feat/project-task-completion` (pronto) é mergeado na master primeiro.
2. Branch novo `feat/tasks-inbox-triage` a partir da master.
3. Implementar **Parte A → Parte B** (A entrega os bugs; B é aditiva e isolada).

## Fora de escopo (YAGNI)

- Reatribuir projeto na triagem.
- Drag-and-drop na aba Por Projeto.
- Persistir seleção de filtro entre navegações.
- Captura rápida com prazo/prioridade.
- Tarefas sem projeto (inbox global "projectless").
