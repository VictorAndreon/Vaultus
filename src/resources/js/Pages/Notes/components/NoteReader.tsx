import { Note } from '@/types/notes'
import { Icons } from '@/Components/Icons'

interface Props {
  note: Note | null
  onEdit?: () => void
  onDelete?: () => void
}

export default function NoteReader({ note, onEdit, onDelete }: Props) {
  if (!note) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontSize: 14 }}>
        Selecione uma nota para ler.
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div className="eyebrow">
          <span>{note.notebook_name.toUpperCase()}</span>
          <span>·</span>
          <span>ATUALIZADO {note.updated_at}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onEdit && <button className="icon-btn" onClick={onEdit} aria-label="Editar"><Icons.Edit size={13} /></button>}
          {onDelete && <button className="icon-btn" onClick={onDelete} aria-label="Deletar"><Icons.Trash size={13} /></button>}
        </div>
      </div>

      <h2 className="h-2" style={{ marginBottom: 18 }}>{note.title}</h2>

      <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
        {note.content}
      </div>

      {note.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          {note.tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="tag"><span className="dot" />{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
