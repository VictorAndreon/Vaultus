import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Project, Want } from '@/types'
import ProjectForm from './components/ProjectForm'
import WantForm from './components/WantForm'

interface Props {
    projects: { data: Project[] }
    wants: { data: Want[] }
}

const STATUS_TAG: Record<string, string> = {
    active: 'tag-green', paused: 'tag-gold', done: 'tag-sky', archived: 'tag',
}
const STATUS_LABEL: Record<string, string> = {
    active: 'Ativo', paused: 'Em pausa', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectsIndex({ projects, wants }: Props) {
    const [showProjectForm, setShowProjectForm] = useState(false)
    const [editingProject, setEditingProject]   = useState<Project | null>(null)
    const [showWantForm, setShowWantForm]       = useState(false)
    const [editingWant, setEditingWant]         = useState<Want | null>(null)

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
                        { label: 'Ativos', value: String(projects.data.filter(p => p.status === 'active').length), sub: 'projetos em andamento' },
                        { label: 'Em pausa', value: String(projects.data.filter(p => p.status === 'paused').length), sub: 'aguardando retomada' },
                        { label: 'Concluídos', value: String(projects.data.filter(p => p.status === 'done').length), sub: 'este ano' },
                        { label: 'Vontades', value: String(wants.data.length), sub: 'prontas para promover' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '16px 20px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
                            <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
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
                                <div
                                    key={p.id}
                                    className="card"
                                    style={{ padding: '22px 24px', cursor: 'pointer' }}
                                    onClick={() => router.get('/projects/' + p.id)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <span className={`tag ${STATUS_TAG[p.status] ?? 'tag'}`}><span className="dot" />{STATUS_LABEL[p.status] ?? p.status}</span>
                                            </div>
                                            <h3 className="h-2">{p.title}</h3>
                                            {p.description && (
                                                <div style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 13, maxWidth: '42ch' }}>{p.description}</div>
                                            )}
                                        </div>
                                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingProject(p); setShowProjectForm(true) }}>Editar</button>
                                        </div>
                                    </div>
                                    <div className="meter" style={{ margin: '16px 0 14px' }}>
                                        <span style={{ width: '0%' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                                        <span><span className="mono" style={{ color: 'var(--text-2)' }}>{p.tasks_count ?? 0}</span> tarefas</span>
                                        <a className="card-link">Abrir <Icons.ChevronRight size={11} /></a>
                                    </div>
                                </div>
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
                                    <div style={{ textAlign: 'right' }}>
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
