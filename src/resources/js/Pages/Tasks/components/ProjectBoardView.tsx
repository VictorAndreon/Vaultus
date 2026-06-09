import { useState } from 'react'
import { router } from '@inertiajs/react'

export interface BoardTask {
    id: number
    title: string
    priority: 'urgent' | 'high' | 'medium' | 'low' | null
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
const PRIO_TAG: Record<string, string> = { urgent: 'tag-rose', high: 'tag-rose', medium: 'tag-gold', low: 'tag-sky' }

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

            {visible.map((p) => {
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
