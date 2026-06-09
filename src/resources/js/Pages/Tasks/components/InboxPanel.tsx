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
