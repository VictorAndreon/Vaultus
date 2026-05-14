import { Want } from '@/types'

interface Props { want: Want; onEdit: (w: Want) => void }

const PRIO_TAG: Record<string, string> = { high: 'tag-rose', medium: 'tag-gold', low: 'tag-sky' }
const PRIO_LABEL: Record<string, string> = { high: 'alta', medium: 'média', low: 'baixa' }

export default function WantCard({ want, onEdit }: Props) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', padding: '14px 20px', borderTop: '1px solid var(--line-soft)', alignItems: 'center', fontSize: 13.5 }}>
            <div>{want.title}</div>
            <div className="muted">{want.category ?? '—'}</div>
            <div>
                {want.priority ? (
                    <span className={`tag ${PRIO_TAG[want.priority] ?? 'tag'}`}>
                        <span className="dot" />{PRIO_LABEL[want.priority] ?? want.priority}
                    </span>
                ) : <span className="muted">—</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(want)}>Editar</button>
            </div>
        </div>
    )
}
