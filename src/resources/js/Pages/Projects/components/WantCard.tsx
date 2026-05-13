import { router } from '@inertiajs/react'
import { Want } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    want: Want
    onEdit: (w: Want) => void
}

const priorityBadge: Record<string, string> = {
    low:    'bg-slate-700 text-slate-400',
    medium: 'bg-yellow-600/20 text-yellow-400',
    high:   'bg-red-600/20 text-red-400',
}

const priorityLabel: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' }

export default function WantCard({ want, onEdit }: Props) {
    function handlePromote() {
        if (!confirm(`Promover "${want.title}" para projeto?`)) return
        router.post('/wants/' + want.id + '/promote')
    }

    function handleDelete() {
        if (!confirm(`Excluir "${want.title}"?`)) return
        router.delete('/wants/' + want.id, {}, { preserveScroll: true })
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm text-slate-200 truncate">{want.title}</p>
                {want.category && <p className="text-xs text-slate-500 mt-0.5">{want.category}</p>}
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[want.priority]}`}>
                    {priorityLabel[want.priority]}
                </span>
            </div>
            <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => onEdit(want)}>Editar</Button>
                <Button variant="primary" size="sm" onClick={handlePromote}>Promover</Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>×</Button>
            </div>
        </div>
    )
}
