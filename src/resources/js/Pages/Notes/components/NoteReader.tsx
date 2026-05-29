import { Note } from '@/types/notes'

interface Props {
  note: Note | null
}

export default function NoteReader({ note }: Props) {
  if (!note) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontSize: 14 }}>
        Selecione uma nota para ler.
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 32 }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>
        <span>{note.notebook_name.toUpperCase()}</span>
        <span>·</span>
        <span>ATUALIZADO {note.updated_at}</span>
      </div>

      <h2 className="h-2" style={{ marginBottom: 18 }}>{note.title}</h2>

      <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
        {note.content}
      </div>

      {note.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          {note.tags.map(tag => (
            <span key={tag} className="tag"><span className="dot" />{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
