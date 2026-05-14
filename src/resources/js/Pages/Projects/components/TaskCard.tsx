import { Draggable } from '@hello-pangea/dnd'
import { ProjectTask } from '@/types'

interface Props {
    task: ProjectTask
    index: number
    onEdit: (t: ProjectTask) => void
}

const priorityDotColor: Record<string, string> = {
    low:    'var(--text-3)',
    medium: 'var(--gold)',
    high:   'var(--rose)',
    urgent: 'var(--rose)',
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
                    style={{
                        background: 'var(--surface-2)',
                        border: snapshot.isDragging ? '1px solid var(--green)' : '1px solid var(--line)',
                        borderRadius: 'var(--r-2)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        ...provided.draggableProps.style,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ marginTop: 6, width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: priorityDotColor[task.priority] ?? 'var(--text-3)' }} />
                        <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.4, margin: 0 }}>{task.title}</p>
                    </div>
                    {task.due_at && (
                        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, paddingLeft: 16, fontFamily: 'var(--mono)' }}>{task.due_at}</p>
                    )}
                </div>
            )}
        </Draggable>
    )
}
