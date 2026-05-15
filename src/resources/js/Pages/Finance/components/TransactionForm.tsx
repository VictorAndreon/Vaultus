import { useState } from 'react'
import { router } from '@inertiajs/react'
import CurrencyInput from '@/Components/CurrencyInput'
import { Transaction } from '@/types'

export const TRANSACTION_CATEGORIES = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
    'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
    'Investimento', 'Outros',
] as const

interface AccountOption {
    id: number
    name: string
    type: string
}

interface Props {
    accountId: number
    transaction: Transaction | null
    onClose: () => void
    accounts?: AccountOption[]
    budgetCategories?: string[]
}

function todayStr() {
    return new Date().toISOString().slice(0, 10)
}

export default function TransactionForm({ accountId, transaction, onClose, accounts = [], budgetCategories = [] }: Props) {
    const [type, setType] = useState<'income' | 'expense' | 'transfer'>(transaction?.type ?? 'expense')
    const [amount, setAmount] = useState<number>(transaction?.amount ?? 0)
    const [description, setDescription] = useState(transaction?.description ?? '')
    const [category, setCategory] = useState(transaction?.category ?? '')
    const [occurred_at, setOccurredAt] = useState(transaction?.occurred_at ?? todayStr())
    const [transferToAccountId, setTransferToAccountId] = useState<number | ''>('')

    const isNewTransaction = transaction === null
    const categoryOptions = budgetCategories.length > 0 ? budgetCategories : [...TRANSACTION_CATEGORIES]
    const otherAccounts = accounts.filter(a => a.id !== accountId)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const data: Record<string, unknown> = {
            type,
            amount_encrypted: amount,
            description,
            occurred_at,
        }

        if (type === 'transfer') {
            data.transfer_to_account_id = transferToAccountId
        } else {
            data.category = category || null
        }

        if (isNewTransaction) {
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
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                    {/* Type tabs */}
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
                        <div className="seg">
                            <button
                                type="button"
                                data-active={type === 'income'}
                                onClick={() => setType('income')}
                                style={type === 'income' ? { background: 'var(--green-wash)', color: 'var(--green)' } : undefined}
                            >
                                Receita
                            </button>
                            <button
                                type="button"
                                data-active={type === 'expense'}
                                onClick={() => setType('expense')}
                                style={type === 'expense' ? { background: 'oklch(40% 0.12 20 / 20%)', color: 'var(--rose)' } : undefined}
                            >
                                Despesa
                            </button>
                            {isNewTransaction && otherAccounts.length > 0 && (
                                <button
                                    type="button"
                                    data-active={type === 'transfer'}
                                    onClick={() => setType('transfer')}
                                    style={type === 'transfer' ? { background: 'oklch(40% 0.08 260 / 20%)', color: 'var(--sky)' } : undefined}
                                >
                                    Transferência
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={type === 'transfer' ? 'Ex: Reserva mensal' : 'Ex: Supermercado'}
                            required
                            className="input"
                        />
                    </div>

                    {/* Amount */}
                    <div style={{ width: 128 }}>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                        <CurrencyInput className="input" value={amount} onValueChange={setAmount} required />
                    </div>

                    {/* Transfer destination */}
                    {type === 'transfer' && (
                        <div style={{ width: 200 }}>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Conta destino</label>
                            <select
                                value={transferToAccountId}
                                onChange={e => setTransferToAccountId(Number(e.target.value))}
                                className="input"
                                required
                            >
                                <option value="">Selecionar conta</option>
                                {otherAccounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Category */}
                    {type !== 'transfer' && (
                        <div style={{ width: 160 }}>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="input"
                            >
                                <option value="">Sem categoria</option>
                                {categoryOptions.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date */}
                    <div style={{ width: 160 }}>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
                        <input
                            type="date"
                            value={occurred_at}
                            onChange={e => setOccurredAt(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                    </div>
                </div>
            </form>
        </div>
    )
}
