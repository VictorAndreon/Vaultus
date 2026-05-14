import { router } from '@inertiajs/react'
import { Project } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props { project: Project; onEdit: (p: Project) => void }

const STATUS_TAG: Record<string, string> = {
    active: 'tag-green', paused: 'tag-gold', done: 'tag-sky', archived: 'tag',
}
const STATUS_LABEL: Record<string, string> = {
    active: 'Ativo', paused: 'Em pausa', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectCard({ project, onEdit }: Props) {
    function handleDelete() {
        if (!confirm(`Excluir o projeto "${project.title}"?`)) return
        router.delete('/projects/' + project.id, {}, { preserveScroll: true })
    }

    return (
        <div className="card" style={{ padding: '22px 24px', cursor: 'pointer' }} onClick={() => router.get('/projects/' + project.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span className={`tag ${STATUS_TAG[project.status] ?? 'tag'}`}><span className="dot" />{STATUS_LABEL[project.status] ?? project.status}</span>
                    </div>
                    <h3 className="h-2">{project.title}</h3>
                    {project.description && (
                        <div style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 13, maxWidth: '42ch' }}>{project.description}</div>
                    )}
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(project)}>Editar</button>
                    <button className="btn btn-ghost btn-sm" onClick={handleDelete}>Excluir</button>
                </div>
            </div>
            <div className="meter" style={{ margin: '16px 0 14px' }}><span style={{ width: '0%' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                {project.tasks_count !== undefined && (
                    <span><span className="mono" style={{ color: 'var(--text-2)' }}>{project.tasks_count}</span> tarefas</span>
                )}
                <a className="card-link">Abrir <Icons.ChevronRight size={11} /></a>
            </div>
        </div>
    )
}
