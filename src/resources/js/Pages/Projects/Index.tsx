import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Project, Want } from '@/types'
import ProjectCard from './components/ProjectCard'
import ProjectForm from './components/ProjectForm'
import WantCard from './components/WantCard'
import WantForm from './components/WantForm'
import Button from '@/Components/ui/Button'

interface Props {
    projects: { data: Project[] }
    wants: { data: Want[] }
}

export default function ProjectsIndex({ projects, wants }: Props) {
    const [showProjectForm, setShowProjectForm] = useState(false)
    const [editingProject, setEditingProject]   = useState<Project | null>(null)
    const [showWantForm, setShowWantForm]       = useState(false)
    const [editingWant, setEditingWant]         = useState<Want | null>(null)
    const [wantsOpen, setWantsOpen]             = useState(true)

    return (
        <AppLayout title="Projetos">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

                {/* Projects section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-300">Projetos</h2>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => { setEditingProject(null); setShowProjectForm(true) }}
                        >
                            Novo projeto
                        </Button>
                    </div>

                    {projects.data.length === 0 ? (
                        <p className="text-xs text-slate-500">Nenhum projeto ainda.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.data.map(p => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    onEdit={proj => { setEditingProject(proj); setShowProjectForm(true) }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Wants section */}
                <div>
                    <button
                        className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4 w-full text-left"
                        onClick={() => setWantsOpen(o => !o)}
                    >
                        <span>{wantsOpen ? '▾' : '▸'}</span>
                        Vontades ({wants.data.length})
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={e => { e.stopPropagation(); setEditingWant(null); setShowWantForm(true) }}
                        >
                            Nova vontade
                        </Button>
                    </button>

                    {wantsOpen && (
                        <div className="space-y-2">
                            {wants.data.length === 0 ? (
                                <p className="text-xs text-slate-500">Nenhuma vontade registrada.</p>
                            ) : (
                                wants.data.map(w => (
                                    <WantCard
                                        key={w.id}
                                        want={w}
                                        onEdit={want => { setEditingWant(want); setShowWantForm(true) }}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showProjectForm && (
                <ProjectForm
                    project={editingProject}
                    onClose={() => setShowProjectForm(false)}
                />
            )}
            {showWantForm && (
                <WantForm
                    want={editingWant}
                    onClose={() => setShowWantForm(false)}
                />
            )}
        </AppLayout>
    )
}
