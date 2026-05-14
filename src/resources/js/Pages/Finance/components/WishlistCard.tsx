import { WishlistItem } from '@/types'

interface Props { item: WishlistItem; onEdit: (i: WishlistItem) => void; onDelete: (i: WishlistItem) => void }

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const PRIO_TAG: Record<string, string> = { high: 'tag-rose', medium: 'tag-gold', low: 'tag' }
const PRIO_LABEL: Record<string, string> = { high: 'Alta', medium: 'Média', low: 'Baixa' }

export default function WishlistCard({ item, onEdit, onDelete }: Props) {
    return (
        <div className="card" style={{ padding: '18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text)', fontSize: 13.5 }}>{item.name}</span>
                        <span className={`tag ${PRIO_TAG[item.priority] ?? 'tag'}`}><span className="dot" />{PRIO_LABEL[item.priority] ?? item.priority}</span>
                        {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="card-link" style={{ fontSize: 12 }}>↗</a>
                        )}
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--text)', marginTop: 4 }}>
                        {item.estimated_price != null ? fmtBRL(item.estimated_price) : '—'}
                    </div>
                    {item.goal && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, fontFamily: 'var(--mono)' }}>Meta: {item.goal.name}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>Editar</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }} onClick={() => onDelete(item)}>Excluir</button>
                </div>
            </div>
        </div>
    )
}
