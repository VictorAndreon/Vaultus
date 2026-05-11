import { useState } from 'react'
import { router } from '@inertiajs/react'
import { WishlistItem, FinancialGoal } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    item: WishlistItem | null
    goals: FinancialGoal[]
    onClose: () => void
}

export default function WishlistForm({ item, goals, onClose }: Props) {
    const [name, setName] = useState(item?.name ?? '')
    const [estimatedPrice, setEstimatedPrice] = useState(item?.estimated_price != null ? String(item.estimated_price) : '')
    const [priority, setPriority] = useState(item?.priority ?? 'medium')
    const [url, setUrl] = useState(item?.url ?? '')
    const [notes, setNotes] = useState(item?.notes ?? '')
    const [goalId, setGoalId] = useState<string>(item?.financial_goal_id ? String(item.financial_goal_id) : '')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = {
            name,
            estimated_price_encrypted: estimatedPrice || null,
            priority,
            url: url || null,
            notes: notes || null,
            financial_goal_id: goalId || null,
        }
        if (item) {
            router.patch('/finance/wishlist/' + item.id, payload, { preserveScroll: true })
        } else {
            router.post('/finance/wishlist', payload, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center">
            <div className="fixed bg-slate-900 border border-slate-800 z-50 w-full max-w-sm mx-auto top-1/3 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    {item ? 'Editar item' : 'Novo item'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Preço estimado (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={estimatedPrice}
                            onChange={e => setEstimatedPrice(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Prioridade</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value as WishlistItem['priority'])}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Notas</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Meta associada</label>
                        <select
                            value={goalId}
                            onChange={e => setGoalId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">Nenhuma</option>
                            {goals.map(g => (
                                <option key={g.id} value={String(g.id)}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" size="sm">Salvar</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
