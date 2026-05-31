import { useState } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { router } from '@inertiajs/react'
import { Project, ProjectColumn, ProjectTask } from '@/types'
import KanbanColumn from './KanbanColumn'
import TaskForm from './TaskForm'
import { usePrompt } from '@/Components/dialogs/DialogProvider'

interface Props {
    project: Project & { columns: ProjectColumn[] }
}

export default function KanbanBoard({ project }: Props) {
    const prompt = usePrompt()
    const [taskForm, setTaskForm] = useState<{
        open: boolean
        task: ProjectTask | null
        columnId: number
    }>({ open: false, task: null, columnId: project.columns[0]?.id ?? 0 })

    function onDragEnd(result: DropResult) {
        if (!result.destination) return

        const { draggableId, source, destination } = result

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return

        router.patch(
            '/projects/tasks/' + draggableId + '/move',
            {
                project_column_id: Number(destination.droppableId),
                position:          destination.index,
            },
            { preserveScroll: true }
        )
    }

    async function addColumn() {
        const name = await prompt({ title: 'Nova coluna', label: 'Nome', placeholder: 'Ex.: Em revisão' })
        if (!name?.trim()) return
        router.post(
            '/projects/' + project.id + '/columns',
            { name, position: project.columns.length },
            { preserveScroll: true }
        )
    }

    return (
        <div style={{ position: 'relative' }}>
            <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                    {project.columns.map(col => (
                        <KanbanColumn
                            key={col.id}
                            column={col}
                            projectId={project.id}
                            onAddTask={columnId => setTaskForm({ open: true, task: null, columnId })}
                            onEditTask={task => setTaskForm({ open: true, task, columnId: task.project_column_id })}
                        />
                    ))}
                    <button
                        onClick={addColumn}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 288, height: 48, flexShrink: 0, border: '1px dashed var(--line)', borderRadius: 'var(--r-3)', fontSize: 13, color: 'var(--text-3)' }}
                    >
                        + Nova coluna
                    </button>
                </div>
            </DragDropContext>

            {taskForm.open && (
                <TaskForm
                    task={taskForm.task}
                    projectId={project.id}
                    columns={project.columns}
                    defaultColumnId={taskForm.columnId}
                    onClose={() => setTaskForm(f => ({ ...f, open: false }))}
                />
            )}
        </div>
    )
}
