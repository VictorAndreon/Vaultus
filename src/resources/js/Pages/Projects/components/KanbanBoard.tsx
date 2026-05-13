import { useState } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { router } from '@inertiajs/react'
import { Project, ProjectColumn, ProjectTask } from '@/types'
import KanbanColumn from './KanbanColumn'
import TaskForm from './TaskForm'

interface Props {
    project: Project & { columns: ProjectColumn[] }
}

export default function KanbanBoard({ project }: Props) {
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

    function addColumn() {
        const name = prompt('Nome da nova coluna:')
        if (!name?.trim()) return
        router.post(
            '/projects/' + project.id + '/columns',
            { name, position: project.columns.length },
            { preserveScroll: true }
        )
    }

    return (
        <div className="relative">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
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
                        className="flex items-center justify-center w-72 h-12 shrink-0 border border-dashed border-slate-700 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors"
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
