import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { router } from '@inertiajs/react'
import { ProjectColumn, ProjectTask } from '@/types'
import TaskCard from './TaskCard'
import { useConfirm } from '@/Components/dialogs/DialogProvider'

interface Props {
    column: ProjectColumn
    projectId: number
    onAddTask: (columnId: number) => void
    onEditTask: (task: ProjectTask) => void
}

export default function KanbanColumn({ column, projectId, onAddTask, onEditTask }: Props) {
    const confirm = useConfirm()
    const [editingName, setEditingName] = useState(false)
    const [name, setName] = useState(column.name)

    function saveName() {
        setEditingName(false)
        if (name !== column.name) {
            router.patch(`/projects/${projectId}/columns/${column.id}`, { name }, { preserveScroll: true })
        }
    }

    async function deleteColumn() {
        if (!(await confirm({
            title: `Excluir coluna "${column.name}"?`,
            message: 'Todas as tarefas desta coluna também serão excluídas.',
            variant: 'danger',
            confirmText: 'Excluir',
        }))) return
        router.delete(`/projects/${projectId}/columns/${column.id}`, {}, { preserveScroll: true })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: 288, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                {editingName ? (
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={saveName}
                        onKeyDown={e => e.key === 'Enter' && saveName()}
                        className="input"
                        style={{ padding: '2px 8px', fontSize: 12 }}
                    />
                ) : (
                    <button
                        className="kicker"
                        style={{ textAlign: 'left', flex: 1, background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => setEditingName(true)}
                    >
                        {column.name}
                    </button>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 8 }}>{column.tasks.length}</span>
                <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 4 }}
                    onClick={deleteColumn}
                >×</button>
            </div>

            <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                            flex: 1,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            minHeight: 80,
                            background: snapshot.isDraggingOver ? 'var(--surface-2)' : undefined,
                            transition: 'background 0.15s',
                        }}
                    >
                        {column.tasks.map((task, i) => (
                            <TaskCard key={task.id} task={task} index={i} onEdit={onEditTask} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            <div style={{ padding: '0 12px 12px' }}>
                <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => onAddTask(column.id)}
                >
                    + Adicionar tarefa
                </button>
            </div>
        </div>
    )
}
