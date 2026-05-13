import { Draggable } from '@hello-pangea/dnd'
import { ProjectTask } from '@/types'

interface Props {
    task: ProjectTask
    index: number
    onEdit: (t: ProjectTask) => void
}

const priorityDot: Record<string, string> = {
    low:    'bg-slate-500',
    medium: 'bg-yellow-500',
    high:   'bg-orange-500',
    urgent: 'bg-red-500',
}

export default function TaskCard({ task, index, onEdit }: Props) {
    return (
        <Draggable draggableId={String(task.id)} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onEdit(task)}
                    className={`bg-slate-800 border rounded-lg p-3 cursor-pointer transition-colors ${
                        snapshot.isDragging
                            ? 'border-indigo-500 shadow-lg shadow-indigo-900/40'
                            : 'border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <div className="flex items-start gap-2">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
                        <p className="text-sm text-slate-200 leading-snug">{task.title}</p>
                    </div>
                    {task.due_at && (
                        <p className="text-xs text-slate-500 mt-1 pl-4">{task.due_at}</p>
                    )}
                </div>
            )}
        </Draggable>
    )
}
