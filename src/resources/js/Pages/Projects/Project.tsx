import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Project, ProjectColumn, ProjectNote, ProjectLink } from '@/types'
import KanbanBoard from './components/KanbanBoard'
import ProjectNotesList from './components/ProjectNotesList'
import ProjectLinksList from './components/ProjectLinksList'
import ProjectForm from './components/ProjectForm'

type FullProject = Project & { columns: ProjectColumn[]; notes: ProjectNote[]; links: ProjectLink[] }
interface Props { project: { data: FullProject } }
type Tab = 'notes' | 'links'

const STATUS_TAG: Record<string, string> = {
    active: 'tag-green', paused: 'tag-gold', done: 'tag-sky', archived: 'tag',
}
const STATUS_LABEL: Record<string, string> = {
    active: 'Ativo', paused: 'Em pausa', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectPage({ project: { data: project } }: Props) {
    const [editOpen, setEditOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('notes')

    return (
        <AppLayout
            title={project.title}
            eyebrow="Projetos"
            actions={
                <button className="btn btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
                    <Icons.Edit size={13} /> Editar
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Header card */}
                <div className="card" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <button className="card-link" onClick={() => router.get('/projects')}>
                                    <Icons.ChevronLeft size={11} /> Projetos
                                </button>
                                <span className={`tag ${STATUS_TAG[project.status] ?? 'tag'}`}>
                                    <span className="dot" />{STATUS_LABEL[project.status] ?? project.status}
                                </span>
                            </div>
                            <h2 className="h-display" style={{ fontSize: 28 }}>{project.title}</h2>
                            {project.description && (
                                <div style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 13.5, maxWidth: '60ch' }}>{project.description}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Kanban */}
                <KanbanBoard project={project} />

                {/* Tabs: Notes / Links */}
                <div>
                    <div className="seg" style={{ marginBottom: 16 }}>
                        <button data-active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Notas</button>
                        <button data-active={activeTab === 'links'} onClick={() => setActiveTab('links')}>Links</button>
                    </div>
                    {activeTab === 'notes' && <ProjectNotesList project={project} />}
                    {activeTab === 'links' && <ProjectLinksList project={project} />}
                </div>
            </div>

            {editOpen && <ProjectForm project={project} onClose={() => setEditOpen(false)} />}
        </AppLayout>
    )
}
