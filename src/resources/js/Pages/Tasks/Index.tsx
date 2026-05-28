import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import Sparkline from '@/Components/charts/Sparkline'

interface Task {
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

interface Props {
    tasks: Task[]
    stats: { today: number; overdue: number; this_week: number; no_due: number }
    by_project: Array<{ project_name: string; count: number }>
    no_due_tasks: Array<{ id: number; title: string }>
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

export default function TasksIndex({ tasks, stats, by_project, no_due_tasks }: Props) {
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
                        { label: 'Hoje',        value: String(stats.today),     unit: `/ ${stats.today + stats.this_week}`, sub: `${stats.today} pendentes`,                                spark: [3,5,4,7,6,8,5,6,4,5,3,stats.today],                                   accent: 'var(--green)' },
                        { label: 'Atrasadas',   value: String(stats.overdue),                                                  sub: stats.overdue === 0 ? 'bom trabalho' : 'requer atenção',  spark: [1,2,1,3,2,4,2,3,2,1,2,stats.overdue],                                 accent: stats.overdue > 0 ? 'var(--rose)' : 'var(--text-3)' },
                        { label: 'Esta semana', value: String(stats.this_week),                                                sub: 'prazo esta semana',                                       spark: [8,10,7,9,11,8,10,9,7,8,10,stats.this_week],                           accent: 'var(--gold)' },
                        { label: 'Sem prazo',   value: String(stats.no_due),                                                   sub: 'ver Inbox',                                               spark: [4,5,3,6,4,7,5,6,4,5,6,stats.no_due],                                  accent: 'var(--sky)' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '16px 20px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>
                                {s.value}{s.unit && <span className="unit">{s.unit}</span>}
                            </div>
                            <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
                            <div className="stat-spark">
                                <Sparkline data={s.spark} accent={s.accent} area />
                            </div>
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

                    {/* Aside */}
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="card-head">
                                <div className="card-title">Inbox <b style={{ color: 'var(--green)' }}>· {stats.no_due}</b></div>
                                <a className="card-link">Processar</a>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {no_due_tasks.length === 0
                                    ? <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Inbox vazia.</div>
                                    : no_due_tasks.map(x => (
                                        <div key={x.id} style={{ fontSize: 13, color: 'var(--text-2)', padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                                            {x.title}
                                        </div>
                                    ))
                                }
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
