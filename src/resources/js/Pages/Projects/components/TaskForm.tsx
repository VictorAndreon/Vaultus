import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { ProjectTask, ProjectColumn } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    task: ProjectTask | null
    projectId: number
    columns: ProjectColumn[]
    defaultColumnId: number
    onClose: () => void
}

export default function TaskForm({ task, projectId, columns, defaultColumnId, onClose }: Props) {
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

    function handleDelete() {
        if (!task || !confirm('Excluir tarefa?')) return
        router.delete('/projects/tasks/' + task.id, {}, { preserveScroll: true })
        onClose()
    }

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-slate-200">{task ? 'Editar tarefa' : 'Nova tarefa'}</h2>
                <button className="text-slate-500 hover:text-slate-300 text-lg leading-none" onClick={onClose}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Coluna</label>
                    <select
                        value={colId}
                        onChange={e => setColId(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Prioridade</label>
                    <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as ProjectTask['priority'])}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Prazo</label>
                    <input
                        type="date"
                        value={dueAt}
                        onChange={e => setDueAt(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Descrição</label>
                    <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    {task ? (
                        <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>Excluir</Button>
                    ) : null}
                    <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary" size="sm">Salvar</Button>
                </div>
            </form>
        </div>
    )
}
