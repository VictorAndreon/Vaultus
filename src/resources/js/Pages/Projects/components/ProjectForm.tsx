import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Project } from '@/types'

interface Props {
    project: Project | null
    onClose: () => void
}

export default function ProjectForm({ project, onClose }: Props) {
    const [title, setTitle]   = useState(project?.title ?? '')
    const [desc, setDesc]     = useState(project?.description ?? '')
    const [status, setStatus] = useState(project?.status ?? 'active')

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
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 28, width: '100%', maxWidth: 480, zIndex: 50 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                    {project ? 'Editar projeto' : 'Novo projeto'}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            rows={3}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as Project['status'])}
                            className="input"
                        >
                            <option value="active">Ativo</option>
                            <option value="paused">Pausado</option>
                            <option value="done">Concluído</option>
                            <option value="archived">Arquivado</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
