import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Note, Notebook } from '@/types/notes'
import { Icons } from '@/Components/Icons'

interface Props {
  note: Note | null
  notebooks: Notebook[]
  onClose: () => void
}

export default function NoteEditor({ note, notebooks, onClose }: Props) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [notebookId, setNotebookId] = useState<number>(note?.notebook_id ?? notebooks[0]?.id ?? 0)
  const [tagsInput, setTagsInput] = useState((note?.tags ?? []).join(', '))

  useEffect(() => {
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setNotebookId(note?.notebook_id ?? notebooks[0]?.id ?? 0)
    setTagsInput((note?.tags ?? []).join(', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { notebook_id: notebookId, title, content, tags }

    if (note) {
      router.patch(`/notes/${note.id}`, payload, { preserveScroll: true, onSuccess: onClose })
    } else {
      router.post('/notes', payload, { preserveScroll: true, onSuccess: onClose })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 640, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h-3">{note ? 'Editar nota' : 'Nova nota'}</h3>
          <button type="button" className="icon-btn" onClick={onClose}><Icons.X size={13} /></button>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Caderno</div>
          <select
            value={notebookId}
            onChange={(e) => setNotebookId(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
          >
            {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
          </select>
        </label>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Título</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--serif)' }}
          />
        </label>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Conteúdo</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
          />
        </label>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Tags (separadas por vírgula)</div>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ideia, design, leitura"
            style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm">{note ? 'Salvar' : 'Criar'}</button>
        </div>
      </form>
    </div>
  )
}
