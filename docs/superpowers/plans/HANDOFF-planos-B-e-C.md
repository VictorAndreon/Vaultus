# Handoff — Planos B e C

**Data:** 2026-05-14  
**Sessão anterior:** Plano A concluído integralmente.  
**Próximos passos:** Executar Plano B (restyling) e Plano C (novas páginas + stubs).

---

## Estado atual do repositório

Branch: `master`  
Último commit: `eb73ed2`

**Commits realizados nesta sessão:**
```
eb73ed2 fix: use React.Fragment with key in HabitGrid to fix React key warning
e2624d9 feat(dashboard): substituir mocks por props reais no Dashboard/Index
5a652f7 feat: pass real data props to Dashboard via Inertia
53d30eb feat: expand DashboardAggregator with tasks, projects, goals, wealth chart and reading methods
24bcf89 feat: add LibraryItem model with progress_percent accessor
4e90023 feat(ui): migrate Button component to design system
b33fcee feat(styles): add CSS grid helper classes
```

---

## O que foi feito (Plano A — 100% concluído)

| Task | Status | Commit |
|------|--------|--------|
| A1: Grid helpers (`app.css`) | ✅ | `b33fcee` |
| A2: Button → design system | ✅ | `4e90023` |
| A3: LibraryItem model + User relation | ✅ | `24bcf89` |
| A4: DashboardAggregator (5 novos métodos) | ✅ | `53d30eb` |
| A5: DashboardController (novas props) | ✅ | `5a652f7` |
| A6: Dashboard/Index.tsx (dados reais) | ✅ | `eb73ed2` |

Todos os 9 testes de `DashboardTest` passam.

---

## O que precisa ser feito

### Plano B — Restyling das páginas existentes
**Arquivo:** `docs/superpowers/plans/2026-05-14-plano-b-restyling-paginas.md`

4 tasks, nenhuma dependência de backend:

| Task | Páginas/componentes |
|------|---------------------|
| B1: Projetos | `Projects/Index.tsx`, `Projects/Project.tsx`, `ProjectCard`, `WantCard`, `KanbanBoard`, `KanbanColumn`, `TaskCard`, `TaskForm`, `ProjectForm`, `WantForm`, `ProjectNotesList`, `ProjectLinksList` |
| B2: Hábitos | `Habits/Index.tsx`, `HabitCard`, `HealthMetricsPanel`, `FrequencyBadge`, `StreakDisplay`, `HabitDrawer` |
| B3: Finanças | `Finance/Index.tsx`, `AccountCard`, `AccountForm`, `GoalCard`, `GoalForm`, `WishlistCard`, `WishlistForm`, `TransactionList`, `TransactionForm` |
| B4: Diário | `Journal/Index.tsx`, `EntryList`, `EntryEditor`, `JournalCalendar`, `PromptsPanel`, `PromptManager` |

### Plano C — Novas páginas + Stubs
**Arquivo:** `docs/superpowers/plans/2026-05-14-plano-c-novas-paginas-stubs.md`

3 tasks, requer backend + frontend:

| Task | O que criar |
|------|-------------|
| C1: Página Tarefas | `TasksController`, `Tasks/Index.tsx`, `TasksTest`, route `/tasks` |
| C2: Página Biblioteca | `LibraryController`, `Library/Index.tsx`, `LibraryTest`, route `/library` |
| C3: Stubs estilizados | Reescrever `Stub/Index.tsx` (Notas, Contatos, Revisão) |

---

## Contexto técnico essencial

**Stack:** Laravel 11 + Inertia.js + React 18 + TypeScript

**Docker:**
- npm/node: `docker compose --profile dev run --rm node sh -c "npm run build"`
- TypeScript: `docker compose --profile dev run --rm node sh -c "npx tsc --noEmit"`
- PHP testes: `docker compose exec app php artisan test`
- URL local: `https://vaultus.local`

**Regras de estilo (design system):**
- `bg-slate-N / border-slate-N` → `var(--surface)` / `var(--line)` / `var(--text-2)`
- `bg-indigo-600` → `var(--green)` ou classe `.btn-primary`
- `rounded-xl p-5 border border-slate-800` → `className="card"`
- `text-sm font-semibold text-slate-400 uppercase` → `className="kicker"`
- Grids: `className="grid g-2"` (não `grid grid-cols-2 gap-4`)
- Ícones: `<Icons.NomeDoIcone size={N} />` (o componente está em `src/resources/js/Components/Icons.tsx`)
- Botões inline: `<button className="btn btn-primary btn-sm">` (não `<Button variant="primary">`)
- **Sem Co-Authored-By em commits** (política do projeto)

**Arquivos de referência visual (já extraídos):**
- `/tmp/vaultus-handoff/vaultus/project/vaultus-modules-a.jsx` — Tarefas, Projetos, Hábitos, Diário
- `/tmp/vaultus-handoff/vaultus/project/vaultus-modules-b.jsx` — Finanças, Biblioteca, Notas, Contatos, Revisão
- `/tmp/vaultus-handoff/vaultus/project/vaultus-shell.jsx` — Sidebar, Topbar, pageActions
- `/tmp/vaultus-handoff/vaultus/project/vaultus-styles.css` — Classes de referência

**Estrutura de domínios PHP:**
```
src/app/Domains/
  Auth/Models/User.php              ← relations: habits, projects, accounts, financialGoals, libraryItems
  Projects/Models/Project.php       ← hasMany(ProjectTask), hasMany(ProjectColumn)
  Projects/Models/ProjectTask.php   ← belongsTo(Project), belongsTo(ProjectColumn via column)
  Projects/Models/ProjectColumn.php ← name (detectar "done"/"conclu" = coluna concluída)
  Finance/Models/FinancialGoal.php  ← current_amount (accessor), progress_percent (accessor)
  Finance/Models/Transaction.php    ← amount_encrypted (EncryptedCast), type (income/expense)
  Finance/Models/Account.php        ← current_balance (accessor)
  Library/Models/LibraryItem.php    ← progress_percent (accessor) — CRIADO NESTA SESSÃO
  Dashboard/Services/DashboardAggregator.php — EXPANDIDO NESTA SESSÃO
```

**Rotas atuais que precisam mudar (Plano C):**
```php
// Em src/routes/web.php — atualmente:
$stubs = ['tasks', 'library', 'notes', 'contacts', 'reviews'];
foreach ($stubs as $module) {
    Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
}

// Após Plano C — tasks e library virarão rotas reais:
Route::get('/tasks', [TasksController::class, 'index'])->name('tasks');
Route::get('/library', [LibraryController::class, 'index'])->name('library');
$stubs = ['notes', 'contacts', 'reviews']; // apenas esses 3 ficam como stubs
```

---

## Como retomar

1. Abrir nova sessão no projeto `/home/andreon/Documentos/Vaultus`
2. Confirmar estado: `git log --oneline -5` (deve mostrar `eb73ed2` no topo)
3. Usar `/execute-plans` ou subagent-driven development
4. Ler os planos:
   - `docs/superpowers/plans/2026-05-14-plano-b-restyling-paginas.md`
   - `docs/superpowers/plans/2026-05-14-plano-c-novas-paginas-stubs.md`
5. Executar B1 → B2 → B3 → B4 → C1 → C2 → C3 (nessa ordem)

**Nota:** O Plano B é pré-requisito do Plano C apenas no sentido visual (já que as classes CSS precisam existir), mas todas as classes já existem em `app.css` após o Plano A. Os dois planos podem ser executados em qualquer ordem.
