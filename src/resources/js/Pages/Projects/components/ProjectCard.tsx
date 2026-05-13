import { router } from '@inertiajs/react'
import { Project } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    project: Project
    onEdit: (p: Project) => void
}

const statusBadge: Record<string, string> = {
    active:   'bg-emerald-600/20 text-emerald-400',
    paused:   'bg-yellow-600/20 text-yellow-400',
    done:     'bg-slate-600/20 text-slate-400',
    archived: 'bg-slate-700 text-slate-500',
}

const statusLabel: Record<string, string> = {
    active: 'Ativo', paused: 'Pausado', done: 'Concluído', archived: 'Arquivado',
}

export default function ProjectCard({ project, onEdit }: Props) {
    function handleDelete() {
        if (!confirm(`Excluir o projeto "${project.title}"?`)) return
        router.delete('/projects/' + project.id, {}, { preserveScroll: true })
    }

    return (
        <div
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={() => router.get('/projects/' + project.id)}
        >
            <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-slate-200">{project.title}</p>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={handleDelete}>Excluir</Button>
                </div>
            </div>
            {project.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[project.status] ?? ''}`}>
                    {statusLabel[project.status] ?? project.status}
                </span>
                {project.tasks_count !== undefined && (
                    <span className="text-xs text-slate-500">{project.tasks_count} tarefas</span>
                )}
            </div>
        </div>
    )
}
