import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { router } from '@inertiajs/react'
import { ProjectColumn, ProjectTask } from '@/types'
import TaskCard from './TaskCard'
import Button from '@/Components/ui/Button'

interface Props {
    column: ProjectColumn
    projectId: number
    onAddTask: (columnId: number) => void
    onEditTask: (task: ProjectTask) => void
}

export default function KanbanColumn({ column, projectId, onAddTask, onEditTask }: Props) {
    const [editingName, setEditingName] = useState(false)
    const [name, setName] = useState(column.name)

    function saveName() {
        setEditingName(false)
        if (name !== column.name) {
            router.patch(`/projects/${projectId}/columns/${column.id}`, { name }, { preserveScroll: true })
        }
    }

    function deleteColumn() {
        if (!confirm(`Excluir coluna "${column.name}" e todas as suas tarefas?`)) return
        router.delete(`/projects/${projectId}/columns/${column.id}`, {}, { preserveScroll: true })
    }

    return (
        <div className="flex flex-col w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                {editingName ? (
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={saveName}
                        onKeyDown={e => e.key === 'Enter' && saveName()}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                ) : (
                    <button
                        className="text-sm font-medium text-slate-300 hover:text-slate-100 text-left flex-1"
                        onClick={() => setEditingName(true)}
                    >
                        {column.name}
                    </button>
                )}
                <span className="text-xs text-slate-600 ml-2">{column.tasks.length}</span>
                <button
                    className="ml-2 text-slate-600 hover:text-red-400 text-sm leading-none"
                    onClick={deleteColumn}
                >×</button>
            </div>

            <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 space-y-2 min-h-[80px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-slate-800/50' : ''
                        }`}
                    >
                        {column.tasks.map((task, i) => (
                            <TaskCard key={task.id} task={task} index={i} onEdit={onEditTask} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            <div className="px-3 pb-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-slate-500 hover:text-slate-300"
                    onClick={() => onAddTask(column.id)}
                >
                    + Adicionar tarefa
                </Button>
            </div>
        </div>
    )
}
