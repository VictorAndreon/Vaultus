import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Project, ProjectNote, ProjectColumn, ProjectLink } from '@/types'

type FullProject = Project & { columns: ProjectColumn[]; notes: ProjectNote[]; links: ProjectLink[] }
interface Props { project: FullProject }

export default function ProjectLinksList({ project }: Props) {
    const [title, setTitle] = useState('')
    const [url, setUrl]     = useState('')

    function addLink(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim() || !url.trim()) return
        router.post('/projects/' + project.id + '/links', { title, url }, { preserveScroll: true })
        setTitle('')
        setUrl('')
    }

    function deleteLink(id: number) {
        router.delete('/projects/links/' + id, { preserveScroll: true })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 0 }}>
                {project.links.length === 0 ? (
                    <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum link adicionado.</div>
                ) : (
                    project.links.map((link, i) => (
                        <div key={link.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                            <div>
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="card-link" style={{ fontSize: 14 }}>
                                    {link.title}
                                </a>
                                <div className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>{link.url}</div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => deleteLink(link.id)}>×</button>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={addLink} style={{ display: 'flex', gap: 8 }}>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título"
                    required
                    className="input"
                    style={{ flex: 1 }}
                />
                <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://…"
                    required
                    className="input"
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm">Adicionar</button>
            </form>
        </div>
    )
}
