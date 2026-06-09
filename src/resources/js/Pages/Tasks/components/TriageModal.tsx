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
