import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Project, ProjectNote, ProjectColumn, ProjectLink } from '@/types'
import { useConfirm } from '@/Components/dialogs/DialogProvider'

type FullProject = Project & { columns: ProjectColumn[]; notes: ProjectNote[]; links: ProjectLink[] }
interface Props { project: FullProject }

export default function ProjectNotesList({ project }: Props) {
    const confirm = useConfirm()
    const [newContent, setNewContent] = useState('')
    const [editingId, setEditingId]   = useState<number | null>(null)
    const [editContent, setEditContent] = useState('')

    function addNote() {
        if (!newContent.trim()) return
        router.post('/projects/' + project.id + '/notes', { content: newContent }, { preserveScroll: true })
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

    async function deleteNote(id: number) {
        if (!(await confirm({ title: 'Excluir nota?', variant: 'danger', confirmText: 'Excluir' }))) return
        router.delete('/projects/notes/' + id, { preserveScroll: true })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {project.notes.map(note => (
                <div key={note.id} className="card" style={{ padding: '16px 20px' }}>
                    {editingId === note.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <textarea
                                autoFocus
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={4}
                                className="input"
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                                <button className="btn btn-primary btn-sm" onClick={saveEdit}>Salvar</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <p style={{ margin: 0, color: 'var(--text-2)', whiteSpace: 'pre-wrap', flex: 1, fontSize: 14, lineHeight: 1.6 }}>{note.content}</p>
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(note)}>Editar</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => deleteNote(note.id)}>×</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Adicionar nota…"
                    rows={3}
                    className="input"
                />
                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={addNote}>Adicionar</button>
            </div>
        </div>
    )
}
