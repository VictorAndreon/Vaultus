import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Project } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    project: Project | null
    onClose: () => void
}

export default function ProjectForm({ project, onClose }: Props) {
    const [title, setTitle]       = useState(project?.title ?? '')
    const [desc, setDesc]         = useState(project?.description ?? '')
    const [status, setStatus]     = useState(project?.status ?? 'active')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { title, description: desc || null, status }
        if (project) {
            router.patch('/projects/' + project.id, payload, { preserveScroll: true })
        } else {
            router.post('/projects', payload, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm z-50">
                <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    {project ? 'Editar projeto' : 'Novo projeto'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Descrição</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as Project['status'])}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="active">Ativo</option>
                            <option value="paused">Pausado</option>
                            <option value="done">Concluído</option>
                            <option value="archived">Arquivado</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" size="sm">Salvar</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
