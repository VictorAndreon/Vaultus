import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import TaskQuickModal, { ProjectOption } from './components/TaskQuickModal'
import TaskListView, { Task, InboxItem } from './components/TaskListView'

interface Props {
    tasks: Task[]
    stats: { today: number; overdue: number; this_week: number; no_due: number }
    by_project: Array<{ project_name: string; count: number }>
    projects: ProjectOption[]
    inbox: InboxItem[]
    inbox_count: number
}

export default function TasksIndex(props: Props) {
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <AppLayout
            title="Tarefas"
            eyebrow="Execução"
            subtitle={`${props.stats.today} tarefas para hoje · ${props.stats.this_week} esta semana.`}
            actions={
                <>
                    <button className="btn btn-ghost btn-sm"><Icons.Filter size={13} /> Filtros</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}><Icons.Plus size={13} /> Nova tarefa</button>
                </>
            }
        >
            <TaskListView
                tasks={props.tasks}
                stats={props.stats}
                by_project={props.by_project}
                projects={props.projects}
                inbox={props.inbox}
                inbox_count={props.inbox_count}
            />

            {createOpen && <TaskQuickModal projects={props.projects} onClose={() => setCreateOpen(false)} />}
        </AppLayout>
    )
}
