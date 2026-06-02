import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { ProjectTask, ProjectColumn } from '@/types'
import { useConfirm } from '@/Components/dialogs/DialogProvider'

interface Props {
    task: ProjectTask | null
    projectId: number
    columns: ProjectColumn[]
    defaultColumnId: number
    onClose: () => void
}

export default function TaskForm({ task, projectId, columns, defaultColumnId, onClose }: Props) {
    const confirm = useConfirm()
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

    async function handleDelete() {
        if (!task) return
        if (!(await confirm({ title: 'Excluir tarefa?', variant: 'danger', confirmText: 'Excluir' }))) return
        router.delete('/projects/tasks/' + task.id, { preserveScroll: true })
        onClose()
    }

    return (
        <div style={{ position: 'fixed', inset: '0 0 0 auto', width: 320, background: 'var(--surface)', borderLeft: '1px solid var(--line)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, margin: 0 }}>{task ? 'Editar tarefa' : 'Nova tarefa'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className="input"
                    />
                </div>
                <div>
                    <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Coluna</label>
                    <select
                        value={colId}
                        onChange={e => setColId(Number(e.target.value))}
                        className="input"
                    >
                        {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prioridade</label>
                    <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as ProjectTask['priority'])}
                        className="input"
                    >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>
                <div>
                    <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prazo</label>
                    <input
                        type="date"
                        value={dueAt}
                        onChange={e => setDueAt(e.target.value)}
                        className="input"
                    />
                </div>
                <div>
                    <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
                    <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={4}
                        className="input"
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
                    {task && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={handleDelete}>Excluir</button>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                </div>
            </form>
        </div>
    )
}
