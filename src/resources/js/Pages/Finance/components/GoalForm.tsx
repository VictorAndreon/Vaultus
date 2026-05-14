import { useState } from 'react'
import { router } from '@inertiajs/react'
import { FinancialGoal } from '@/types'

interface Props {
    goal: FinancialGoal | null
    onClose: () => void
}

export default function GoalForm({ goal, onClose }: Props) {
    const [name, setName] = useState(goal?.name ?? '')
    const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
    const [category, setCategory] = useState(goal?.category ?? '')
    const [deadline, setDeadline] = useState(goal?.deadline ?? '')
    const [isCompleted, setIsCompleted] = useState(goal?.is_completed ?? false)
    const [isArchived, setIsArchived] = useState(goal?.is_archived ?? false)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (goal) {
            router.patch('/finance/goals/' + goal.id, {
                name,
                target_amount_encrypted: targetAmount,
                category: category || null,
                deadline: deadline || null,
                is_completed: isCompleted,
                is_archived: isArchived,
            }, { preserveScroll: true })
        } else {
            router.post('/finance/goals', {
                name,
                target_amount_encrypted: targetAmount,
                category: category || null,
                deadline: deadline || null,
            }, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 28, width: '100%', maxWidth: 480, zIndex: 50 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                    {goal ? 'Editar meta' : 'Nova meta'}
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
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Meta (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={targetAmount}
                            onChange={e => setTargetAmount(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prazo</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="input"
                        />
                    </div>

                    {goal && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="checkbox"
                                    id="is_completed"
                                    checked={isCompleted}
                                    onChange={e => setIsCompleted(e.target.checked)}
                                    style={{ accentColor: 'var(--green)' }}
                                />
                                <label htmlFor="is_completed" className="kicker">Concluída</label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="checkbox"
                                    id="is_archived"
                                    checked={isArchived}
                                    onChange={e => setIsArchived(e.target.checked)}
                                    style={{ accentColor: 'var(--green)' }}
                                />
                                <label htmlFor="is_archived" className="kicker">Arquivada</label>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
