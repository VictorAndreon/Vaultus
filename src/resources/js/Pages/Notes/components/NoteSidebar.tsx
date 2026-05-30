import { useState } from 'react'
import { Note } from '@/types/notes'

interface Props {
  notes: Note[]
  activeId: number | null
  search: string
  onSearch: (s: string) => void
  onSelect: (id: number) => void
}

export default function NoteSidebar({ notes, activeId, search, onSearch, onSelect }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const q = search.toLowerCase()
  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const filtered = notes.filter(n =>
    (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) &&
    (!activeTag || n.tags.includes(activeTag))
  )

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="text"
        placeholder="Buscar notas..."
        aria-label="Buscar notas"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 6,
          color: 'var(--text)',
          fontSize: 13,
        }}
      />

      {allTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allTags.map(tag => {
            const active = tag === activeTag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(active ? null : tag)}
                aria-pressed={active}
                className={active ? 'tag tag-green' : 'tag'}
                style={{ cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span className="dot" />{tag}
              </button>
            )
          })}
        </div>
      )}

      <div className="kicker" style={{ marginTop: 8 }}>
        {activeTag ? `#${activeTag}` : 'Todas'} · {filtered.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
            Nenhuma nota encontrada.
          </div>
        )}
        {filtered.map(n => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={n.id === activeId ? 'accent-line' : ''}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              background: n.id === activeId ? 'var(--surface-2)' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--text)',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="mono">{n.notebook_name}</span>
              <span style={{ color: 'var(--text-4)' }}>·</span>
              <span>{n.updated_at_relative}</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
