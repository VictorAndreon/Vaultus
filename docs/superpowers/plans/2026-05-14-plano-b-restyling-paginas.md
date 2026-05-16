# Plano B — Restyling das páginas existentes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Pré-requisito:** Plano A concluído (grid helpers em app.css, Button migrado).

**Goal:** Migrar todas as páginas existentes (Projetos, Hábitos, Finanças, Diário) e seus subcomponentes para o design system — substituindo classes Tailwind genéricas por tokens OKLCH e classes `.card`, `.btn`, `.kicker`, `.tag`, `.meter`, etc.

**Architecture:** Cada página recebe o mesmo tratamento: (1) remover wrappers de largura máxima e espaçamento Tailwind, (2) substituir classes de cor slate/indigo por tokens CSS e classes do design system, (3) preservar toda a lógica de estado e callbacks intocada. O `AppLayout` já gerencia o shell — não há necessidade de wrappers extras nas páginas.

**Tech Stack:** React 18, TypeScript, design system CSS (tokens OKLCH, classes `.card`, `.btn`, etc.), Inertia.js

---

## Regras de tradução (referência rápida)

| Antes (Tailwind) | Depois (design system) |
|---|---|
| `bg-slate-900 border border-slate-800 rounded-xl p-5` | `className="card"` |
| `text-sm font-semibold text-slate-400 uppercase tracking-wider` | `className="kicker"` |
| `text-slate-200 / text-slate-300` | `style={{ color: 'var(--text)' }}` / `var(--text-2)` |
| `text-slate-500 / text-slate-600` | `var(--text-3)` / `var(--text-4)` |
| `bg-indigo-600 text-white` | `className="btn btn-primary"` |
| `text-slate-400 hover:bg-slate-800` | `className="btn btn-ghost"` |
| `bg-emerald-600/20 text-emerald-400` (badge) | `className="tag tag-green"` |
| `bg-yellow-600/20 text-yellow-400` (badge) | `className="tag tag-gold"` |
| `bg-red-600/20 text-red-400` (badge) | `className="tag tag-rose"` |
| `h-2 bg-slate-800 rounded-full` + fill `bg-indigo-600` | `className="meter"` + `<span style={{ width: '...%' }} />` |
| `border-indigo-500/40` (checked border) | `var(--green-soft)` via style |
| `grid grid-cols-2 gap-4` | `className="grid g-2"` |
| `max-w-5xl mx-auto px-4 py-6 space-y-8` | remover (AppLayout gerencia) |
| `<Button variant="primary">` | `<button className="btn btn-primary">` nos novos usos |

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| Modify | `src/resources/js/Pages/Projects/Index.tsx` |
| Modify | `src/resources/js/Pages/Projects/Project.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/ProjectCard.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/WantCard.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/KanbanBoard.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/KanbanColumn.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/TaskCard.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/TaskForm.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/ProjectForm.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/WantForm.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/ProjectLinksList.tsx` |
| Modify | `src/resources/js/Pages/Projects/components/ProjectNotesList.tsx` |
| Modify | `src/resources/js/Pages/Habits/Index.tsx` |
| Modify | `src/resources/js/Pages/Habits/components/HabitCard.tsx` |
| Modify | `src/resources/js/Pages/Habits/components/HabitDrawer.tsx` |
| Modify | `src/resources/js/Pages/Habits/components/HealthMetricsPanel.tsx` |
| Modify | `src/resources/js/Pages/Habits/components/FrequencyBadge.tsx` |
| Modify | `src/resources/js/Pages/Habits/components/StreakDisplay.tsx` |
| Modify | `src/resources/js/Pages/Finance/Index.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/AccountCard.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/AccountForm.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/GoalCard.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/GoalForm.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/TransactionList.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/TransactionForm.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/WishlistCard.tsx` |
| Modify | `src/resources/js/Pages/Finance/components/WishlistForm.tsx` |
| Modify | `src/resources/js/Pages/Journal/Index.tsx` |
| Modify | `src/resources/js/Pages/Journal/components/EntryList.tsx` |
| Modify | `src/resources/js/Pages/Journal/components/EntryEditor.tsx` |
| Modify | `src/resources/js/Pages/Journal/components/JournalCalendar.tsx` |
| Modify | `src/resources/js/Pages/Journal/components/PromptsPanel.tsx` |
| Modify | `src/resources/js/Pages/Journal/components/PromptManager.tsx` |

---

## Task 1: Projetos — restyling completo

**Referência visual:** `vaultus-modules-a.jsx` → função `Projetos()`

### 1a. Projects/Index.tsx

- [ ] **Step 1: Reescrever Projects/Index.tsx**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Project, Want } from '@/types'
import ProjectForm from './components/ProjectForm'
import WantForm from './components/WantForm'

interface Props {
    projects: { data: Project[] }
    wants: { data: Want[] }
}

const STATUS_TAG: Record<string, string> = {
    active: 'tag-green', paused: 'tag-gold', done: 'tag-sky', archived: 'tag',
}
const STATUS_LABEL: Record<string, string> = {
    active: 'Ativo', paused: 'Em pausa', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectsIndex({ projects, wants }: Props) {
    const [showProjectForm, setShowProjectForm] = useState(false)
    const [editingProject, setEditingProject]   = useState<Project | null>(null)
    const [showWantForm, setShowWantForm]       = useState(false)
    const [editingWant, setEditingWant]         = useState<Want | null>(null)

    const totalTasks = projects.data.reduce((s, p) => s + (p.tasks_count ?? 0), 0)
    const avgProgress = projects.data.length > 0
        ? Math.round(projects.data.reduce((s, p) => s + (p.tasks_count ?? 0), 0) / projects.data.length)
        : 0

    return (
        <AppLayout
            title="Projetos"
            eyebrow="Execução"
            subtitle="Iniciativas pessoais e profissionais em andamento."
            actions={
                <>
                    <button className="btn btn-ghost btn-sm"><Icons.Filter size={13} /> Filtros</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditingProject(null); setShowProjectForm(true) }}>
                        <Icons.Plus size={13} /> Novo projeto
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div className="grid g-4">
                    {[
                        { label: 'Ativos', value: String(projects.data.filter(p => p.status === 'active').length), sub: 'projetos em andamento' },
                        { label: 'Em pausa', value: String(projects.data.filter(p => p.status === 'paused').length), sub: 'aguardando retomada' },
                        { label: 'Concluídos', value: String(projects.data.filter(p => p.status === 'done').length), sub: 'este ano' },
                        { label: 'Vontades', value: String(wants.data.length), sub: 'prontas para promover' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '16px 20px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
                            <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Project cards */}
                <div>
                    <div className="kicker" style={{ marginBottom: 10 }}>Em andamento</div>
                    {projects.data.length === 0 ? (
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum projeto ainda.</div>
                    ) : (
                        <div className="grid g-2">
                            {projects.data.map(p => (
                                <div
                                    key={p.id}
                                    className="card"
                                    style={{ padding: '22px 24px', cursor: 'pointer' }}
                                    onClick={() => router.get('/projects/' + p.id)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <span className={`tag ${STATUS_TAG[p.status] ?? 'tag'}`}><span className="dot" />{STATUS_LABEL[p.status] ?? p.status}</span>
                                            </div>
                                            <h3 className="h-2">{p.title}</h3>
                                            {p.description && (
                                                <div style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 13, maxWidth: '42ch' }}>{p.description}</div>
                                            )}
                                        </div>
                                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingProject(p); setShowProjectForm(true) }}>Editar</button>
                                        </div>
                                    </div>
                                    <div className="meter" style={{ margin: '16px 0 14px' }}>
                                        <span style={{ width: '0%' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                                        <span><span className="mono" style={{ color: 'var(--text-2)' }}>{p.tasks_count ?? 0}</span> tarefas</span>
                                        <a className="card-link">Abrir <Icons.ChevronRight size={11} /></a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Wants table */}
                <div>
                    <div className="kicker" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Vontades — projetos em incubação · {wants.data.length}</span>
                        <button className="card-link" onClick={() => { setEditingWant(null); setShowWantForm(true) }}>
                            <Icons.Plus size={11} /> Adicionar vontade
                        </button>
                    </div>
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', padding: '12px 20px', borderBottom: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <div>Vontade</div><div>Área</div><div>Prioridade</div><div></div>
                        </div>
                        {wants.data.length === 0 ? (
                            <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma vontade registrada.</div>
                        ) : (
                            wants.data.map((w, i) => (
                                <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', padding: '14px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13.5 }}>
                                    <div>{w.title}</div>
                                    <div className="muted">{w.area ?? '—'}</div>
                                    <div>
                                        <span className={`tag ${w.priority === 'high' ? 'tag-rose' : w.priority === 'medium' ? 'tag-gold' : 'tag-sky'}`}>
                                            <span className="dot" />{w.priority === 'high' ? 'alta' : w.priority === 'medium' ? 'média' : 'baixa'}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditingWant(w); setShowWantForm(true) }}>Editar</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {showProjectForm && <ProjectForm project={editingProject} onClose={() => setShowProjectForm(false)} />}
            {showWantForm && <WantForm want={editingWant} onClose={() => setShowWantForm(false)} />}
        </AppLayout>
    )
}
```

### 1b. Projects/Project.tsx

- [ ] **Step 2: Reescrever Projects/Project.tsx**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Project, ProjectColumn, ProjectNote, ProjectLink } from '@/types'
import KanbanBoard from './components/KanbanBoard'
import ProjectNotesList from './components/ProjectNotesList'
import ProjectLinksList from './components/ProjectLinksList'
import ProjectForm from './components/ProjectForm'

type FullProject = Project & { columns: ProjectColumn[]; notes: ProjectNote[]; links: ProjectLink[] }
interface Props { project: { data: FullProject } }
type Tab = 'notes' | 'links'

const STATUS_TAG: Record<string, string> = {
    active: 'tag-green', paused: 'tag-gold', done: 'tag-sky', archived: 'tag',
}
const STATUS_LABEL: Record<string, string> = {
    active: 'Ativo', paused: 'Em pausa', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectPage({ project: { data: project } }: Props) {
    const [editOpen, setEditOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('notes')

    return (
        <AppLayout
            title={project.title}
            eyebrow="Projetos"
            actions={
                <button className="btn btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
                    <Icons.Edit size={13} /> Editar
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Header card */}
                <div className="card" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <button className="card-link" onClick={() => router.get('/projects')}>
                                    <Icons.ChevronLeft size={11} /> Projetos
                                </button>
                                <span className={`tag ${STATUS_TAG[project.status] ?? 'tag'}`}>
                                    <span className="dot" />{STATUS_LABEL[project.status] ?? project.status}
                                </span>
                            </div>
                            <h2 className="h-display" style={{ fontSize: 28 }}>{project.title}</h2>
                            {project.description && (
                                <div style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 13.5, maxWidth: '60ch' }}>{project.description}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Kanban */}
                <KanbanBoard project={project} />

                {/* Tabs: Notes / Links */}
                <div>
                    <div className="seg" style={{ marginBottom: 16 }}>
                        <button data-active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Notas</button>
                        <button data-active={activeTab === 'links'} onClick={() => setActiveTab('links')}>Links</button>
                    </div>
                    {activeTab === 'notes' && <ProjectNotesList project={project} />}
                    {activeTab === 'links' && <ProjectLinksList project={project} />}
                </div>
            </div>

            {editOpen && <ProjectForm project={project} onClose={() => setEditOpen(false)} />}
        </AppLayout>
    )
}
```

### 1c. ProjectCard.tsx

- [ ] **Step 3: Reescrever ProjectCard.tsx**

```tsx
import { router } from '@inertiajs/react'
import { Project } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props { project: Project; onEdit: (p: Project) => void }

const STATUS_TAG: Record<string, string> = {
    active: 'tag-green', paused: 'tag-gold', done: 'tag-sky', archived: 'tag',
}
const STATUS_LABEL: Record<string, string> = {
    active: 'Ativo', paused: 'Em pausa', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectCard({ project, onEdit }: Props) {
    function handleDelete() {
        if (!confirm(`Excluir o projeto "${project.title}"?`)) return
        router.delete('/projects/' + project.id, {}, { preserveScroll: true })
    }

    return (
        <div className="card" style={{ padding: '22px 24px', cursor: 'pointer' }} onClick={() => router.get('/projects/' + project.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span className={`tag ${STATUS_TAG[project.status] ?? 'tag'}`}><span className="dot" />{STATUS_LABEL[project.status] ?? project.status}</span>
                    </div>
                    <h3 className="h-2">{project.title}</h3>
                    {project.description && (
                        <div style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 13, maxWidth: '42ch' }}>{project.description}</div>
                    )}
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(project)}>Editar</button>
                    <button className="btn btn-ghost btn-sm" onClick={handleDelete}>Excluir</button>
                </div>
            </div>
            <div className="meter" style={{ margin: '16px 0 14px' }}><span style={{ width: '0%' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                {project.tasks_count !== undefined && (
                    <span><span className="mono" style={{ color: 'var(--text-2)' }}>{project.tasks_count}</span> tarefas</span>
                )}
                <a className="card-link">Abrir <Icons.ChevronRight size={11} /></a>
            </div>
        </div>
    )
}
```

### 1d. WantCard.tsx

- [ ] **Step 4: Reescrever WantCard.tsx**

```tsx
import { Want } from '@/types'

interface Props { want: Want; onEdit: (w: Want) => void }

const PRIO_TAG: Record<string, string> = { high: 'tag-rose', medium: 'tag-gold', low: 'tag-sky' }
const PRIO_LABEL: Record<string, string> = { high: 'alta', medium: 'média', low: 'baixa' }

export default function WantCard({ want, onEdit }: Props) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', padding: '14px 20px', borderTop: '1px solid var(--line-soft)', alignItems: 'center', fontSize: 13.5 }}>
            <div>{want.title}</div>
            <div className="muted">{want.area ?? '—'}</div>
            <div>
                {want.priority ? (
                    <span className={`tag ${PRIO_TAG[want.priority] ?? 'tag'}`}>
                        <span className="dot" />{PRIO_LABEL[want.priority] ?? want.priority}
                    </span>
                ) : <span className="muted">—</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(want)}>Editar</button>
            </div>
        </div>
    )
}
```

### 1e. KanbanBoard.tsx, KanbanColumn.tsx, TaskCard.tsx

- [ ] **Step 5: Migrar KanbanBoard.tsx**

Ler o arquivo atual e aplicar substituições de tokens. O layout do kanban (colunas flex horizontais) permanece. Apenas alterar:
- `bg-slate-800` → background: `var(--surface-2)`
- `bg-slate-900` → background: `var(--surface)`
- `text-slate-400` → `color: var(--text-3)`
- `text-slate-200` → `color: var(--text)`
- `border-slate-700` → `border-color: var(--line)`
- `rounded-xl` → `borderRadius: 'var(--r-3)'`

Abrir `src/resources/js/Pages/Projects/components/KanbanBoard.tsx` e substituir todas as classes Tailwind acima pelos equivalentes como `style={{}}` inline ou classes do design system.

- [ ] **Step 6: Migrar KanbanColumn.tsx**

Mesmas substituições de KanbanBoard.tsx. Adicionalmente:
- Cabeçalho da coluna: usar `.kicker` para o nome
- Botão "Adicionar tarefa": `className="btn btn-ghost btn-sm"`

- [ ] **Step 7: Migrar TaskCard.tsx**

Substituições:
- Container: `className="card"` com `padding: '12px 14px'`
- Título: `color: var(--text)`, `fontSize: 13.5`
- Badge prioridade: `.tag .tag-rose/.tag-gold/.tag-sky`
- Botões de ação: `.btn .btn-ghost .btn-sm`

### 1f. Forms (ProjectForm, WantForm, TaskForm)

- [ ] **Step 8: Migrar ProjectForm.tsx**

Substituições principais:
- Modal overlay: `background: oklch(0% 0 0 / 60%)` (remover `bg-black/60`)
- Modal card: `className="card"` com `padding: 28px`, `maxWidth: 480px`
- Labels: `.kicker`
- Inputs: `className="input"`
- Botões: `.btn .btn-primary` / `.btn .btn-ghost`
- `text-slate-400` → `color: var(--text-3)`

- [ ] **Step 9: Migrar WantForm.tsx**

Mesmas substituições de ProjectForm.tsx.

- [ ] **Step 10: Migrar TaskForm.tsx**

Mesmas substituições de ProjectForm.tsx.

### 1g. ProjectNotesList.tsx, ProjectLinksList.tsx

- [ ] **Step 11: Migrar ProjectNotesList.tsx**

- Container de lista: `.card` com `padding: 0`
- Cada nota: `padding: '16px 20px'`, `borderTop: '1px solid var(--line-soft)'`
- Título: `color: var(--text)`, `fontFamily: var(--serif)`, `fontSize: 15`
- Preview: `color: var(--text-3)`, `fontSize: 13`
- Botões: `.btn .btn-ghost .btn-sm`

- [ ] **Step 12: Migrar ProjectLinksList.tsx**

- Container: `.card` com `padding: 0`
- Cada link: `padding: '12px 20px'`, `borderTop: '1px solid var(--line-soft)'`
- URL: `.mono .muted`, `fontSize: 12`
- Botões: `.btn .btn-ghost .btn-sm`

- [ ] **Step 13: Build e type-check da Task 1 (Projetos)**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 14: Commit**

```bash
git add src/resources/js/Pages/Projects/
git commit -m "style: migrate Projects pages and components to design system"
```

---

## Task 2: Hábitos — restyling completo

**Referência visual:** `vaultus-modules-a.jsx` → função `Habitos()`

### 2a. Habits/Index.tsx

- [ ] **Step 1: Reescrever Habits/Index.tsx**

```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Habit, HealthMetric } from '@/types'
import HabitCard from './components/HabitCard'
import HabitDrawer from './components/HabitDrawer'
import HealthMetricsPanel from './components/HealthMetricsPanel'

interface Props { habits: Habit[]; today_metrics: HealthMetric | null; today: string }

const WEEK = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

export default function HabitsIndex({ habits, today_metrics, today }: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

    const openCreate = () => { setEditingHabit(null); setDrawerOpen(true) }
    const openEdit   = (h: Habit) => { setEditingHabit(h); setDrawerOpen(true) }
    const closeDrawer = () => { setDrawerOpen(false); setEditingHabit(null) }

    return (
        <AppLayout
            title="Hábitos"
            eyebrow="Reflexão"
            subtitle={`Consistência sobre intensidade. ${habits.filter(h => h.checked_in_today).length} completados hoje.`}
            actions={
                <>
                    <div className="seg">
                        <button data-active="true">Semana</button>
                        <button>Mês</button>
                        <button>Ano</button>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={openCreate}>
                        <Icons.Plus size={13} /> Novo hábito
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Métricas de hoje */}
                <HealthMetricsPanel todayMetrics={today_metrics} />

                {/* Tabela de hábitos */}
                {habits.length === 0 ? (
                    <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
                            Nenhum hábito ainda.{' '}
                            <button className="card-link" onClick={openCreate}>Criar o primeiro</button>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 100px 120px', padding: '14px 24px', borderBottom: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <div>Hábito</div>
                            <div>Esta semana</div>
                            <div>Taxa · 30d</div>
                            <div>Streak</div>
                            <div></div>
                        </div>
                        {habits.map((h, i) => (
                            <HabitCard key={h.id} habit={h} today={today} onEdit={openEdit} isFirst={i === 0} />
                        ))}
                    </div>
                )}
            </div>

            {drawerOpen && <HabitDrawer habit={editingHabit} onClose={closeDrawer} />}
        </AppLayout>
    )
}
```

### 2b. HabitCard.tsx

- [ ] **Step 2: Reescrever HabitCard.tsx**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import { Habit } from '@/types'

interface Props { habit: Habit; today: string; onEdit: (h: Habit) => void; isFirst: boolean }

const WEEK = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

export default function HabitCard({ habit, today, onEdit, isFirst }: Props) {
    const [checkedIn, setCheckedIn] = useState(habit.checked_in_today)
    const color = checkedIn ? 'var(--green)' : 'var(--gold)'

    const toggle = () => {
        const prev = checkedIn
        setCheckedIn(!prev)
        const method = prev ? 'delete' : 'post'
        router[method](`/habits/${habit.id}/check-in`, {}, {
            preserveState: true, preserveScroll: true,
            onError: () => setCheckedIn(prev),
        })
    }

    const archive = () => {
        router.delete(`/habits/${habit.id}`, {}, { preserveScroll: true })
    }

    // Week dots — last 7 days
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
    })

    const rate = Math.round(
        (habit.recent_check_ins?.filter(d => {
            const cutoff = new Date(today)
            cutoff.setDate(cutoff.getDate() - 29)
            return new Date(d) >= cutoff
        }).length ?? 0) / 30 * 100
    )

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 100px 120px', padding: '18px 24px', borderTop: isFirst ? 'none' : '1px solid var(--line-soft)', alignItems: 'center' }}>
            {/* Hábito */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 50, background: color }} />
                    <div className="h-3">{habit.name}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, marginLeft: 18 }}>
                    {habit.icon ?? ''} {habit.frequency_type === 'daily' ? 'Todo dia' : `${habit.frequency_times}x · semana`}
                </div>
            </div>

            {/* Esta semana — 7 dots */}
            <div style={{ display: 'flex', gap: 6 }}>
                {last7.map((date, di) => {
                    const done = habit.recent_check_ins?.includes(date)
                    const isToday = date === today
                    return (
                        <div key={di} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: isToday ? 'var(--green)' : 'var(--text-4)', textTransform: 'uppercase' }}>{WEEK[di]}</div>
                            <div style={{ width: 18, height: 18, borderRadius: 5, background: done ? color : 'transparent', border: done ? 'none' : '1px dashed var(--line-2)', display: 'grid', placeItems: 'center' }}>
                                {done && <Icons.Check size={11} style={{ color: 'var(--bg)' }} />}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Taxa 30d */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="meter" style={{ flex: 1 }}><span style={{ width: `${rate}%`, background: color }} /></div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{rate}%</span>
                </div>
            </div>

            {/* Streak */}
            <div className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
                {habit.current_streak ?? 0} <span style={{ color: 'var(--text-4)', fontSize: 11 }}>dias</span>
            </div>

            {/* Ações */}
            <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="btn btn-soft btn-sm" onClick={toggle}>
                    <Icons.Check size={12} /> Hoje
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(habit)}>
                    <Icons.Edit size={12} />
                </button>
            </div>
        </div>
    )
}
```

### 2c. HealthMetricsPanel.tsx

- [ ] **Step 3: Reescrever HealthMetricsPanel.tsx**

```tsx
import { HealthMetric } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props { todayMetrics: HealthMetric | null }

function NumMetric({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
    return (
        <div>
            <div className="kicker">{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.01em' }}>{value}</div>
                {unit && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{unit}</span>}
            </div>
            {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--mono)' }}>{hint}</div>}
        </div>
    )
}

function ScaleMetric({ label, value, selected, hue }: { label: string; value: string; selected: number; hue: 'green' | 'gold' }) {
    const color = hue === 'gold' ? 'var(--gold)' : 'var(--green)'
    return (
        <div>
            <div className="kicker">{label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginTop: 4, color: 'var(--text)' }}>{value}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {[1,2,3,4,5].map(s => (
                    <div key={s} style={{ flex: 1, height: 6, borderRadius: 99, background: s <= selected ? color : 'var(--surface-3)' }} />
                ))}
            </div>
        </div>
    )
}

export default function HealthMetricsPanel({ todayMetrics }: Props) {
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="card">
            <div className="card-head">
                <div className="card-title">Métricas de Hoje · <b className="mono">{today}</b></div>
                <a className="card-link">Histórico <Icons.ChevronRight size={11} /></a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 28 }}>
                <ScaleMetric label="Humor" value={todayMetrics?.mood_label ?? '—'} selected={todayMetrics?.mood ?? 3} hue="green" />
                <ScaleMetric label="Energia" value={todayMetrics?.energy_label ?? '—'} selected={todayMetrics?.energy ?? 3} hue="gold" />
                <NumMetric label="Sono" value={todayMetrics?.sleep_hours ? String(todayMetrics.sleep_hours) : '—'} unit="h" hint="meta 7,5h" />
                <NumMetric label="Água" value={todayMetrics?.water_liters ? String(todayMetrics.water_liters) : '—'} unit="L" hint="meta 2,5L" />
                <NumMetric label="Peso" value={todayMetrics?.weight_kg ? String(todayMetrics.weight_kg) : '—'} unit="kg" />
            </div>
        </div>
    )
}
```

### 2d. FrequencyBadge, StreakDisplay, HabitDrawer

- [ ] **Step 4: Migrar FrequencyBadge.tsx**

Substituir qualquer `bg-slate-N text-slate-N rounded` por `.tag` + tokens. Manter toda lógica intacta.

- [ ] **Step 5: Migrar StreakDisplay.tsx**

Substituir classes slate por tokens CSS inline. Manter lógica de display de streak intacta.

- [ ] **Step 6: Migrar HabitDrawer.tsx**

- Overlay: `position: fixed, inset: 0, background: oklch(0% 0 0 / 60%)`
- Drawer panel: `className="card"` + `position: fixed, right: 0, top: 0, height: 100vh, width: 400px, borderRadius: 0`
- Labels: `.kicker`
- Inputs: `.input`
- Botões: `.btn .btn-primary` / `.btn .btn-ghost`

- [ ] **Step 7: Build e type-check da Task 2 (Hábitos)**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
git add src/resources/js/Pages/Habits/
git commit -m "style: migrate Habits pages and components to design system"
```

---

## Task 3: Finanças — restyling completo

**Referência visual:** `vaultus-modules-b.jsx` → função `Financas()`

### 3a. Finance/Index.tsx

- [ ] **Step 1: Reescrever Finance/Index.tsx**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Account, FinancialGoal, WishlistItem } from '@/types'
import AccountCard from './components/AccountCard'
import AccountForm from './components/AccountForm'
import GoalCard from './components/GoalCard'
import GoalForm from './components/GoalForm'
import WishlistCard from './components/WishlistCard'
import WishlistForm from './components/WishlistForm'
import TransactionList from './components/TransactionList'

interface Props {
    accounts: { data: Account[] }
    goals: { data: FinancialGoal[] }
    wishlist: { data: WishlistItem[] }
    net_worth: number
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

type Tab = 'goals' | 'wishlist'

export default function FinanceIndex({ accounts, goals, wishlist, net_worth }: Props) {
    const [editingAccount, setEditingAccount]     = useState<Account | null>(null)
    const [showAccountForm, setShowAccountForm]   = useState(false)
    const [editingGoal, setEditingGoal]           = useState<FinancialGoal | null>(null)
    const [showGoalForm, setShowGoalForm]         = useState(false)
    const [editingWishlist, setEditingWishlist]   = useState<WishlistItem | null>(null)
    const [showWishlistForm, setShowWishlistForm] = useState(false)
    const [activeTab, setActiveTab]               = useState<Tab>('goals')

    function deleteGoal(goal: FinancialGoal) {
        if (!confirm(`Excluir a meta "${goal.name}"?`)) return
        router.delete('/finance/goals/' + goal.id, {}, { preserveScroll: true })
    }

    function deleteWishlistItem(item: WishlistItem) {
        if (!confirm(`Excluir "${item.name}"?`)) return
        router.delete('/finance/wishlist/' + item.id, {}, { preserveScroll: true })
    }

    return (
        <AppLayout
            title="Finanças"
            eyebrow="Patrimônio"
            subtitle="Saldo, fluxo, orçamento e metas."
            actions={
                <>
                    <div className="seg">
                        <button>Mês</button>
                        <button data-active="true">Trim.</button>
                        <button>Ano</button>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditingAccount(null); setShowAccountForm(true) }}>
                        <Icons.Plus size={13} /> Lançamento
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div className="grid g-4">
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Patrimônio Líquido</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{fmtBRL(net_worth)}</div>
                        <div className="stat-delta up"><Icons.ArrowUpRight size={11} /> +2,4% mês</div>
                    </div>
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Contas</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{accounts.data.length}<span className="unit">ativas</span></div>
                        <div className="stat-delta flat">ver detalhes</div>
                    </div>
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Metas</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{goals.data.length}<span className="unit">ativas</span></div>
                        <div className="stat-delta flat">ver metas</div>
                    </div>
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Wishlist</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{wishlist.data.length}<span className="unit">itens</span></div>
                        <div className="stat-delta flat">ver wishlist</div>
                    </div>
                </div>

                {/* Contas + Metas/Wishlist */}
                <div className="grid g-2">
                    {/* Contas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="kicker" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Contas</span>
                            <button className="card-link" onClick={() => { setEditingAccount(null); setShowAccountForm(true) }}>
                                <Icons.Plus size={11} /> Nova conta
                            </button>
                        </div>
                        {accounts.data.length === 0 ? (
                            <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
                        ) : (
                            accounts.data.map(a => (
                                <AccountCard key={a.id} account={a} onEdit={ac => { setEditingAccount(ac); setShowAccountForm(true) }} />
                            ))
                        )}
                    </div>

                    {/* Metas / Wishlist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="seg">
                                <button data-active={activeTab === 'goals'} onClick={() => setActiveTab('goals')}>Metas</button>
                                <button data-active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')}>Wishlist</button>
                            </div>
                            {activeTab === 'goals' && (
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingGoal(null); setShowGoalForm(true) }}>
                                    <Icons.Plus size={12} /> Nova meta
                                </button>
                            )}
                            {activeTab === 'wishlist' && (
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingWishlist(null); setShowWishlistForm(true) }}>
                                    <Icons.Plus size={12} /> Novo item
                                </button>
                            )}
                        </div>

                        {activeTab === 'goals' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {goals.data.length === 0 ? (
                                    <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma meta cadastrada.</div>
                                ) : (
                                    goals.data.map(g => (
                                        <GoalCard key={g.id} goal={g} onEdit={go => { setEditingGoal(go); setShowGoalForm(true) }} onDelete={deleteGoal} />
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'wishlist' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {wishlist.data.length === 0 ? (
                                    <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum item na wishlist.</div>
                                ) : (
                                    wishlist.data.map(item => (
                                        <WishlistCard key={item.id} item={item} onEdit={i => { setEditingWishlist(i); setShowWishlistForm(true) }} onDelete={deleteWishlistItem} />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showAccountForm && <AccountForm account={editingAccount} onClose={() => setShowAccountForm(false)} />}
            {showGoalForm && <GoalForm goal={editingGoal} onClose={() => setShowGoalForm(false)} />}
            {showWishlistForm && <WishlistForm item={editingWishlist} goals={goals.data} onClose={() => setShowWishlistForm(false)} />}
        </AppLayout>
    )
}
```

### 3b. Finance components

- [ ] **Step 2: Migrar AccountCard.tsx**

- Container: `className="card"` substituindo `bg-slate-900 border border-slate-800 rounded-xl p-5`
- Saldo: `fontFamily: var(--serif)`, `fontSize: 24`, `color: var(--text)`
- Label tipo: `.kicker`
- Botões: `.btn .btn-ghost .btn-sm`

- [ ] **Step 3: Migrar GoalCard.tsx**

```tsx
import { FinancialGoal } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props { goal: FinancialGoal; onEdit: (g: FinancialGoal) => void; onDelete: (g: FinancialGoal) => void }

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
    const pct = Math.min(100, Math.round(goal.progress_percent))

    return (
        <div className="card">
            <div className="card-head">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div className="h-3" style={{ fontSize: 13.5 }}>{goal.name}</div>
                        {goal.category && <span className="tag"><span className="dot" />{goal.category}</span>}
                        {goal.is_completed && <span className="tag tag-green"><span className="dot" />Concluída</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Meta: {fmtBRL(goal.target_amount)}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)}>Editar</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }} onClick={() => onDelete(goal)}>Excluir</button>
                </div>
            </div>
            <div className="meter" style={{ marginTop: 12 }}><span style={{ width: `${pct}%` }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                <span className="mono">{fmtBRL(goal.current_amount)} de {fmtBRL(goal.target_amount)}</span>
                <span className="mono" style={{ color: 'var(--green)' }}>{pct}%</span>
            </div>
            {goal.deadline && (
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                    Prazo: {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 4: Migrar WishlistCard.tsx**

Substituições:
- Container: `className="card"`
- Nome: `color: var(--text)`, `fontSize: 13.5`
- Preço: `.mono`, `color: var(--text-2)`
- Botões: `.btn .btn-ghost .btn-sm`

- [ ] **Step 5: Migrar AccountForm, GoalForm, TransactionForm, WishlistForm**

Para cada form (modal):
- Overlay: `position: fixed, inset: 0, background: oklch(0% 0 0 / 60%)`
- Modal: `className="card"`, `maxWidth: 480, padding: 28`
- Labels: `.kicker`
- Inputs/selects: `.input`
- Botões: `.btn .btn-primary` / `.btn .btn-ghost`
- Remover todas as classes `bg-slate-N`, `text-slate-N`, `border-slate-N`, `rounded-N`

- [ ] **Step 6: Migrar TransactionList.tsx**

- Container: `.card` com `padding: 0`
- Cabeçalho de colunas: grid, `.kicker`, `borderBottom: 1px solid var(--line)`
- Cada row: `borderTop: 1px solid var(--line-soft)`, `padding: 14px 20px`
- Valor positivo: `color: var(--green)` (income), negativo: `color: var(--text)`
- Data: `.mono .muted`, `fontSize: 12`

- [ ] **Step 7: Build e type-check da Task 3 (Finanças)**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
git add src/resources/js/Pages/Finance/
git commit -m "style: migrate Finance pages and components to design system"
```

---

## Task 4: Diário — restyling completo

**Referência visual:** `vaultus-modules-a.jsx` → função `Diario()`

### 4a. Journal/Index.tsx

- [ ] **Step 1: Reescrever Journal/Index.tsx**

```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { JournalEntry, JournalPrompt } from '@/types'
import JournalCalendar from './components/JournalCalendar'
import EntryList from './components/EntryList'
import EntryEditor from './components/EntryEditor'
import PromptsPanel from './components/PromptsPanel'

interface Props { entries: JournalEntry[]; prompts: JournalPrompt[]; today: string }

export default function JournalIndex({ entries, prompts, today }: Props) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const currentEntry = selectedDate ? entries.find(e => e.date === selectedDate) ?? null : null

    const totalThisMonth = entries.filter(e => {
        const d = new Date(e.date)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return (
        <AppLayout
            title="Diário"
            eyebrow="Reflexão"
            subtitle={`Pensamentos, eventos e gratidão. ${entries.length} entradas.`}
            actions={
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedDate(today)}>
                    <Icons.Edit size={13} /> Escrever hoje
                </button>
            }
        >
            {selectedDate ? (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <PromptsPanel prompts={prompts} />
                    </aside>
                    <EntryEditor entry={currentEntry} selectedDate={selectedDate} onBack={() => setSelectedDate(null)} />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <JournalCalendar entries={entries} today={today} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                        {/* Tags frequentes placeholder */}
                        <div className="card">
                            <div className="card-head"><div className="card-title">Etiquetas frequentes</div></div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {Array.from(new Set(entries.flatMap(e => e.tags ?? []))).slice(0, 8).map(tag => (
                                    <span key={tag} className="tag"><span className="dot" />{tag}</span>
                                ))}
                                {entries.length === 0 && <span style={{ color: 'var(--text-4)', fontSize: 12, fontStyle: 'italic' }}>Nenhuma etiqueta ainda.</span>}
                            </div>
                        </div>
                    </aside>

                    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {/* Card de hoje */}
                        <div className="card" style={{ padding: 28, borderColor: 'var(--green-soft)', background: 'linear-gradient(180deg, var(--green-wash) 0%, var(--surface) 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <div>
                                    <div className="kicker">Hoje · {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
                                    <h2 className="h-display" style={{ marginTop: 4 }}>
                                        {new Date(today + 'T12:00:00').getDate()}{' '}
                                        <span style={{ color: 'var(--text-3)' }}>de {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' })}</span>
                                    </h2>
                                </div>
                                <button className="btn btn-primary" onClick={() => setSelectedDate(today)}>
                                    <Icons.Edit size={13} /> Escrever entrada
                                </button>
                            </div>
                            <div style={{ marginTop: 18, fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.45, maxWidth: '62ch' }}>
                                "O que sinto que vale ser registrado de hoje?"
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                                {['Gratidão','Reflexão','Evento','Sonho','Insight'].map(t => (
                                    <span key={t} className="tag"><span className="dot" />{t}</span>
                                ))}
                            </div>
                        </div>

                        <EntryList entries={entries} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                    </section>
                </div>
            )}
        </AppLayout>
    )
}
```

### 4b. Journal components

- [ ] **Step 2: Reescrever EntryList.tsx**

```tsx
import { JournalEntry } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props { entries: JournalEntry[]; selectedDate: string | null; onSelectDate: (d: string) => void }

const MOOD_TAG: Record<number, { label: string; cls: string }> = {
    5: { label: 'Ótimo',     cls: 'tag-green' },
    4: { label: 'Bom',       cls: 'tag-green' },
    3: { label: 'Neutro',    cls: 'tag' },
    2: { label: 'Cansado',   cls: 'tag-gold' },
    1: { label: 'Difícil',   cls: 'tag-rose' },
}

export default function EntryList({ entries, selectedDate, onSelectDate }: Props) {
    if (entries.length === 0) return (
        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: 32 }}>
            Nenhuma entrada ainda. Comece escrevendo hoje.
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {entries.map(entry => {
                const d = new Date(entry.date + 'T12:00:00')
                const mood = entry.mood ? MOOD_TAG[entry.mood] : null
                return (
                    <article
                        key={entry.id}
                        className="card"
                        style={{ padding: 28, cursor: 'pointer', borderColor: selectedDate === entry.date ? 'var(--green-soft)' : undefined }}
                        onClick={() => onSelectDate(entry.date)}
                    >
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div style={{ flex: 'none', textAlign: 'center', width: 64, paddingTop: 6 }}>
                                <div style={{ fontFamily: 'var(--serif)', fontSize: 42, lineHeight: 1, color: 'var(--text)' }}>{d.getDate()}</div>
                                <div className="kicker" style={{ marginTop: 4 }}>
                                    {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    {mood && <span className={`tag ${mood.cls}`}><span className="dot" />{mood.label}</span>}
                                    {(entry.tags ?? []).slice(0, 3).map(t => (
                                        <span key={t} className="tag"><span className="dot" />{t}</span>
                                    ))}
                                </div>
                                {entry.preview && (
                                    <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65, fontSize: 14.5, maxWidth: '62ch' }}>{entry.preview}</p>
                                )}
                            </div>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}
```

- [ ] **Step 3: Migrar JournalCalendar.tsx**

Substituições no calendário mensal:
- Container: `className="card"`
- Dias com entrada: `background: var(--green-soft)`, `color: var(--green-bright)`
- Dia hoje: `background: var(--green)`, `color: var(--bg)`
- Dias futuros: `border: 1px dashed var(--line-soft)`, `color: var(--text-4)`
- Navegar meses: `.icon-btn`
- Cabeçalho mês/ano: `.card-title`

- [ ] **Step 4: Migrar EntryEditor.tsx**

- Container: `className="card"` com `padding: 28`
- Textarea: `className="input"` com `minHeight: 200, fontFamily: var(--serif), fontSize: 16`
- Botão salvar: `.btn .btn-primary`
- Botão voltar: `.card-link`

- [ ] **Step 5: Migrar PromptsPanel.tsx e PromptManager.tsx**

- Container: `className="card"`
- Cada prompt: `.kicker` para a categoria, serif italic para o texto
- Botões de gestão: `.btn .btn-ghost .btn-sm`

- [ ] **Step 6: Build e type-check da Task 4 (Diário)**

```bash
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit" 2>&1 | head -20
docker compose --profile dev run --rm node sh -c "npm run build" 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add src/resources/js/Pages/Journal/
git commit -m "style: migrate Journal pages and components to design system"
```
