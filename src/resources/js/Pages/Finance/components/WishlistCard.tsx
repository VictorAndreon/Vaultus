import { WishlistItem } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    item: WishlistItem
    onEdit: (i: WishlistItem) => void
    onDelete: (i: WishlistItem) => void
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const priorityBadge: Record<string, { cls: string; label: string }> = {
    high: { cls: 'bg-red-600/20 text-red-400', label: 'Alta' },
    medium: { cls: 'bg-yellow-600/20 text-yellow-400', label: 'Média' },
    low: { cls: 'bg-slate-700 text-slate-400', label: 'Baixa' },
}

export default function WishlistCard({ item, onEdit, onDelete }: Props) {
    const priority = priorityBadge[item.priority] ?? priorityBadge.low

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>
                        {priority.label}
                    </span>
                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                            ↗
                        </a>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(item)}>Excluir</Button>
                </div>
            </div>

            <p className="text-sm text-slate-300">
                {item.estimated_price != null ? fmtBRL(item.estimated_price) : '—'}
            </p>

            {item.goal && (
                <p className="text-xs text-slate-500 mt-1">Meta: {item.goal.name}</p>
            )}
        </div>
    )
}
