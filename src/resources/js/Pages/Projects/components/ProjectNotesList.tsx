import { useState } from 'react'
import { router } from '@inertiajs/react'
import { ProjectNote } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    notes: ProjectNote[]
    projectId: number
}

export default function ProjectNotesList({ notes, projectId }: Props) {
    const [newContent, setNewContent] = useState('')
    const [editingId, setEditingId]   = useState<number | null>(null)
    const [editContent, setEditContent] = useState('')

    function addNote() {
        if (!newContent.trim()) return
        router.post('/projects/' + projectId + '/notes', { content: newContent }, { preserveScroll: true })
        setNewContent('')
    }

    function startEdit(note: ProjectNote) {
        setEditingId(note.id)
        setEditContent(note.content)
    }

    function saveEdit() {
        if (editingId === null) return
        router.patch('/projects/notes/' + editingId, { content: editContent }, { preserveScroll: true })
        setEditingId(null)
    }

    function deleteNote(id: number) {
        if (!confirm('Excluir nota?')) return
        router.delete('/projects/notes/' + id, {}, { preserveScroll: true })
    }

    return (
        <div className="space-y-3">
            {notes.map(note => (
                <div key={note.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    {editingId === note.id ? (
                        <div className="space-y-2">
                            <textarea
                                autoFocus
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                                <Button variant="primary" size="sm" onClick={saveEdit}>Salvar</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap flex-1">{note.content}</p>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(note)}>Editar</Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>×</Button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="space-y-2">
                <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Adicionar nota…"
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button variant="primary" size="sm" onClick={addNote}>Adicionar</Button>
            </div>
        </div>
    )
}
