import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Project, Want } from '@/types'
import Sparkline from '@/Components/charts/Sparkline'
import ProjectForm from './components/ProjectForm'
import WantForm from './components/WantForm'
import ProjectCard from './components/ProjectCard'
import { useConfirm } from '@/Components/dialogs/DialogProvider'

interface Props {
    projects: { data: Project[] }
    wants: { data: Want[] }
}


export default function ProjectsIndex({ projects, wants }: Props) {
    const confirm = useConfirm()
    const [showProjectForm, setShowProjectForm] = useState(false)
    const [editingProject, setEditingProject]   = useState<Project | null>(null)
    const [showWantForm, setShowWantForm]       = useState(false)
    const [editingWant, setEditingWant]         = useState<Want | null>(null)

    async function promoteWant(w: Want) {
        if (!(await confirm({
            title: `Promover "${w.title}" a projeto?`,
            message: 'Um novo projeto será criado a partir desta vontade.',
            confirmText: 'Promover',
        }))) return
        router.post(`/wants/${w.id}/promote`, {}, { preserveScroll: true })
    }

    return (
        <AppLayout
            title="Projetos"
            eyebrow="Execução"
            subtitle="Iniciativas pessoais e profissionais em andamento."
            actions={
                <>
                    <button className="btn btn-ghost btn-sm"><Icons.Filter size={13} /> Filtros</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditingProject(null); setShowProjectForm(true) }}>
                        <Icons.Plus size={13} /> Novo projeto
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div className="grid g-4">
                    {[
                        { label: 'Ativos',     value: String(projects.data.filter(p => p.status === 'active').length), sub: 'projetos em andamento', spark: [2,3,3,4,4,5,4,4,5,5,5,projects.data.filter(p => p.status === 'active').length], accent: 'var(--green)' },
                        { label: 'Em pausa',   value: String(projects.data.filter(p => p.status === 'paused').length), sub: 'aguardando retomada',   spark: [1,1,2,2,1,2,3,2,2,1,1,projects.data.filter(p => p.status === 'paused').length], accent: 'var(--gold)' },
                        { label: 'Concluídos', value: String(projects.data.filter(p => p.status === 'done').length),   sub: 'este ano',              spark: [0,1,1,2,2,3,3,4,4,5,5,projects.data.filter(p => p.status === 'done').length],   accent: 'var(--sky)' },
                        { label: 'Vontades',   value: String(wants.data.length),                                       sub: 'prontas para promover', spark: [3,4,5,4,6,5,7,6,5,6,7,wants.data.length],                                          accent: 'var(--text-3)' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '16px 20px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
                            <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
                            <div className="stat-spark">
                                <Sparkline data={s.spark} accent={s.accent} area />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Project cards */}
                <div>
                    <div className="kicker" style={{ marginBottom: 10 }}>Em andamento</div>
                    {projects.data.length === 0 ? (
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum projeto ainda.</div>
                    ) : (
                        <div className="grid g-2">
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

                {/* Wants table */}
                <div>
                    <div className="kicker" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Vontades — projetos em incubação · {wants.data.length}</span>
                        <button className="card-link" onClick={() => { setEditingWant(null); setShowWantForm(true) }}>
                            <Icons.Plus size={11} /> Adicionar vontade
                        </button>
                    </div>
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', padding: '12px 20px', borderBottom: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <div>Vontade</div><div>Categoria</div><div>Prioridade</div><div></div>
                        </div>
                        {wants.data.length === 0 ? (
                            <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma vontade registrada.</div>
                        ) : (
                            wants.data.map((w, i) => (
                                <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', padding: '14px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13.5 }}>
                                    <div>{w.title}</div>
                                    <div className="muted">{w.category ?? '—'}</div>
                                    <div>
                                        <span className={`tag ${w.priority === 'high' ? 'tag-rose' : w.priority === 'medium' ? 'tag-gold' : 'tag-sky'}`}>
                                            <span className="dot" />{w.priority === 'high' ? 'alta' : w.priority === 'medium' ? 'média' : 'baixa'}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => promoteWant(w)}>
                                            <Icons.ArrowUpRight size={12} /> Promover
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditingWant(w); setShowWantForm(true) }}>Editar</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {showProjectForm && <ProjectForm project={editingProject} onClose={() => setShowProjectForm(false)} />}
            {showWantForm && <WantForm want={editingWant} onClose={() => setShowWantForm(false)} />}
        </AppLayout>
    )
}
