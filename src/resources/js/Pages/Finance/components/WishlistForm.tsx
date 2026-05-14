import { useState } from 'react'
import { router } from '@inertiajs/react'
import { WishlistItem, FinancialGoal } from '@/types'

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
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 28, width: '100%', maxWidth: 480, zIndex: 50 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                    {item ? 'Editar item' : 'Novo item'}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Preço estimado (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={estimatedPrice}
                            onChange={e => setEstimatedPrice(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prioridade</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value as WishlistItem['priority'])}
                            className="input"
                        >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Notas</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Meta associada</label>
                        <select
                            value={goalId}
                            onChange={e => setGoalId(e.target.value)}
                            className="input"
                        >
                            <option value="">Nenhuma</option>
                            {goals.map(g => (
                                <option key={g.id} value={String(g.id)}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
