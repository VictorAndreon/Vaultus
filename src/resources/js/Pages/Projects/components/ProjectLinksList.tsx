import { useState } from 'react'
import { router } from '@inertiajs/react'
import { ProjectLink } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    links: ProjectLink[]
    projectId: number
}

export default function ProjectLinksList({ links, projectId }: Props) {
    const [title, setTitle] = useState('')
    const [url, setUrl]     = useState('')

    function addLink(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim() || !url.trim()) return
        router.post('/projects/' + projectId + '/links', { title, url }, { preserveScroll: true })
        setTitle('')
        setUrl('')
    }

    function deleteLink(id: number) {
        router.delete('/projects/links/' + id, {}, { preserveScroll: true })
    }

    return (
        <div className="space-y-3">
            {links.map(link => (
                <div key={link.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                    <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:text-indigo-300 truncate flex-1"
                    >
                        {link.title}
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => deleteLink(link.id)}>×</Button>
                </div>
            ))}

            <form onSubmit={addLink} className="flex gap-2">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título"
                    required
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://…"
                    required
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button type="submit" variant="primary" size="sm">Adicionar</Button>
            </form>
        </div>
    )
}
