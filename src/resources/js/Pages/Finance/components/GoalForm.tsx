import { useState } from 'react'
import { router } from '@inertiajs/react'
import { FinancialGoal } from '@/types'
import Button from '@/Components/ui/Button'

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
        <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center">
            <div className="fixed bg-slate-900 border border-slate-800 z-50 w-full max-w-sm mx-auto top-1/3 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    {goal ? 'Editar meta' : 'Nova meta'}
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
                        <label className="text-xs text-slate-500 block mb-1">Meta (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={targetAmount}
                            onChange={e => setTargetAmount(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Categoria</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Prazo</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {goal && (
                        <>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_completed"
                                    checked={isCompleted}
                                    onChange={e => setIsCompleted(e.target.checked)}
                                    className="accent-indigo-500"
                                />
                                <label htmlFor="is_completed" className="text-xs text-slate-400">Concluída</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_archived"
                                    checked={isArchived}
                                    onChange={e => setIsArchived(e.target.checked)}
                                    className="accent-indigo-500"
                                />
                                <label htmlFor="is_archived" className="text-xs text-slate-400">Arquivada</label>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" size="sm">Salvar</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
