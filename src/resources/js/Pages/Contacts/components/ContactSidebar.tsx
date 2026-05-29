import { Contact } from '@/types/contacts'
import GradientAvatar from '@/Components/GradientAvatar'

const CATEGORIES = ['Família', 'Trabalho', 'Saúde', 'Casa'] as const

interface Props {
  contacts: Contact[]
  activeId: number | null
  onSelect: (id: number) => void
}

function groupContacts(contacts: Contact[]): Record<string, Contact[]> {
  const groups: Record<string, Contact[]> = { Família: [], Trabalho: [], Saúde: [], Casa: [], Outros: [] }
  for (const c of contacts) {
    const key = (CATEGORIES as readonly string[]).includes(c.context ?? '') ? c.context! : 'Outros'
    groups[key].push(c)
  }
  return groups
}

const CATEGORY_HUE: Record<string, number> = {
  'Família':  140,
  'Trabalho':  60,
  'Saúde':    230,
  'Casa':     320,
}

export default function ContactSidebar({ contacts, activeId, onSelect }: Props) {
  const groups = groupContacts(contacts)
  const visibleCategories = [...CATEGORIES, 'Outros'].filter(cat => groups[cat].length > 0)

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {visibleCategories.map(cat => (
        <div key={cat}>
          <div className="kicker" style={{ marginBottom: 8 }}>{cat.toUpperCase()} · {groups[cat].length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {groups[cat].map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={c.id === activeId ? 'accent-line' : ''}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  background: c.id === activeId ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <GradientAvatar initials={c.initials} size={28} hue={CATEGORY_HUE[cat]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  {c.next_step && <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.next_step}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
