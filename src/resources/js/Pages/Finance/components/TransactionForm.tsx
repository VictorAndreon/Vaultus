import { useState } from 'react'
import { router } from '@inertiajs/react'
import Button from '@/Components/ui/Button'
import { Transaction } from '@/types'

export const TRANSACTION_CATEGORIES = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
    'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
    'Investimento', 'Outros',
] as const

interface Props {
    accountId: number
    transaction: Transaction | null
    onClose: () => void
}

const inputCls = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const labelCls = 'text-xs text-slate-500 block mb-1'

function todayStr() {
    return new Date().toISOString().slice(0, 10)
}

export default function TransactionForm({ accountId, transaction, onClose }: Props) {
    const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense')
    const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
    const [description, setDescription] = useState(transaction?.description ?? '')
    const [category, setCategory] = useState(transaction?.category ?? '')
    const [occurred_at, setOccurredAt] = useState(transaction?.occurred_at ?? todayStr())

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const data = {
            type,
            amount_encrypted: amount,
            description,
            category: category || null,
            occurred_at,
        }
        if (transaction === null) {
            router.post('/finance/accounts/' + accountId + '/transactions', data, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        } else {
            router.patch('/finance/transactions/' + transaction.id, data, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        }
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
            <form onSubmit={handleSubmit}>
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Type tabs */}
                    <div>
                        <label className={labelCls}>Tipo</label>
                        <div className="flex rounded-lg overflow-hidden border border-slate-700">
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    type === 'income'
                                        ? 'bg-green-600/30 text-green-400'
                                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Receita
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('expense')}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    type === 'expense'
                                        ? 'bg-red-600/30 text-red-400'
                                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Despesa
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-[160px]">
                        <label className={labelCls}>Descrição</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Ex: Supermercado"
                            required
                            className={`${inputCls} w-full`}
                        />
                    </div>

                    {/* Amount */}
                    <div className="w-32">
                        <label className={labelCls}>Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0,00"
                            required
                            className={`${inputCls} w-full`}
                        />
                    </div>

                    {/* Category */}
                    <div className="w-40">
                        <label className={labelCls}>Categoria</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className={`${inputCls} w-full`}
                        >
                            <option value="">Sem categoria</option>
                            {TRANSACTION_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div className="w-40">
                        <label className={labelCls}>Data</label>
                        <input
                            type="date"
                            value={occurred_at}
                            onChange={e => setOccurredAt(e.target.value)}
                            required
                            className={`${inputCls} w-full`}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button type="submit" variant="primary" size="sm">Salvar</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
