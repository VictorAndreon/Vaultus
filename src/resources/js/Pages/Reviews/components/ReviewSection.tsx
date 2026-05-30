import { ReviewItem, CheckState } from '@/types/reviews'

const CHECK_DATA_ATTR: Record<CheckState, string | undefined> = {
  filled: 'true',
  failed: 'failed',
  neutral: 'neutral',
  empty: undefined,
}

interface Props {
  title: string
  kicker: string
  items: ReviewItem[]
  onAdd?: () => void
  onToggle?: (index: number, currentState: CheckState | undefined) => void
}

export default function ReviewSection({ title, kicker, items, onAdd, onToggle }: Props) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="kicker">{kicker}</div>
        <h3 className="h-3" style={{ marginTop: 4 }}>{title}</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nada anotado.</div>
        )}
        {items.map((item, i) => {
          const state = item.state ?? 'empty'
          const attr = CHECK_DATA_ATTR[state]
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div
                className="check"
                data-checked={attr}
                onClick={() => onToggle?.(i, item.state)}
                style={{ cursor: onToggle ? 'pointer' : 'default', flex: 'none', marginTop: 2 }}
              />
              <span style={{ fontSize: 13.5, color: state === 'empty' ? 'var(--text-3)' : 'var(--text-2)' }}>
                {item.text}
              </span>
            </div>
          )
        })}
      </div>

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 14 }}
        >
          + Adicionar item
        </button>
      )}
    </div>
  )
}
