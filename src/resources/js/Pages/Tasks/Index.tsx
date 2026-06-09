import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import TaskQuickModal, { ProjectOption } from './components/TaskQuickModal'
import TaskListView, { Task, InboxItem } from './components/TaskListView'
import ProjectBoardView, { BoardProject } from './components/ProjectBoardView'

interface Props {
    tasks: Task[]
    stats: { today: number; overdue: number; this_week: number; no_due: number }
    by_project: Array<{ project_name: string; count: number }>
    projects: ProjectOption[]
    inbox: InboxItem[]
    inbox_count: number
    projects_board: BoardProject[]
}

type Tab = 'list' | 'board'

export default function TasksIndex(props: Props) {
    const [createOpen, setCreateOpen] = useState(false)
    const [tab, setTab] = useState<Tab>('list')

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
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                <button className={`btn btn-sm ${tab === 'list' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('list')}>Lista</button>
                <button className={`btn btn-sm ${tab === 'board' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('board')}>Por projeto</button>
            </div>

            {tab === 'list' ? (
                <TaskListView
                    tasks={props.tasks}
                    stats={props.stats}
                    by_project={props.by_project}
                    projects={props.projects}
                    inbox={props.inbox}
                    inbox_count={props.inbox_count}
                />
            ) : (
                <ProjectBoardView projectsBoard={props.projects_board} />
            )}

            {createOpen && <TaskQuickModal projects={props.projects} onClose={() => setCreateOpen(false)} />}
        </AppLayout>
    )
}
