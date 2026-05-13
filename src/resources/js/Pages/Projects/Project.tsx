import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Project, ProjectColumn, ProjectNote, ProjectLink } from '@/types'
import KanbanBoard from './components/KanbanBoard'
import ProjectNotesList from './components/ProjectNotesList'
import ProjectLinksList from './components/ProjectLinksList'
import ProjectForm from './components/ProjectForm'
import Button from '@/Components/ui/Button'

type FullProject = Project & {
    columns: ProjectColumn[]
    notes: ProjectNote[]
    links: ProjectLink[]
}

interface Props {
    project: { data: FullProject }
}

type Tab = 'notes' | 'links'

export default function ProjectPage({ project: { data: project } }: Props) {
    const [editOpen, setEditOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('notes')

    const statusLabel: Record<string, string> = {
        active: 'Ativo', paused: 'Pausado', done: 'Concluído', archived: 'Arquivado',
    }

    return (
        <AppLayout title={project.title}>
            <div className="px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <button
                            className="text-xs text-slate-500 hover:text-slate-400 mb-1"
                            onClick={() => router.get('/projects')}
                        >
                            ← Projetos
                        </button>
                        <h1 className="text-xl font-bold text-slate-100">{project.title}</h1>
                        {project.description && (
                            <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                            {statusLabel[project.status] ?? project.status}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>Editar</Button>
                    </div>
                </div>

                {/* Kanban */}
                <KanbanBoard project={project} />

                {/* Tabs: Notes / Links */}
                <div>
                    <div className="flex gap-4 border-b border-slate-800 mb-4">
                        {(['notes', 'links'] as Tab[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-2 text-sm font-medium transition-colors ${
                                    activeTab === tab
                                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {tab === 'notes' ? 'Notas' : 'Links'}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'notes' && (
                        <ProjectNotesList notes={project.notes} projectId={project.id} />
                    )}
                    {activeTab === 'links' && (
                        <ProjectLinksList links={project.links} projectId={project.id} />
                    )}
                </div>
            </div>

            {editOpen && (
                <ProjectForm project={project} onClose={() => setEditOpen(false)} />
            )}
        </AppLayout>
    )
}
