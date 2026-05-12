import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Transaction, PaginatedResponse } from '@/types'
import Button from '@/Components/ui/Button'
import TransactionForm from './TransactionForm'
import { TRANSACTION_CATEGORIES } from './TransactionForm'

interface Props {
    transactions: PaginatedResponse<Transaction>
    accountId: number
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function TransactionList({ transactions, accountId }: Props) {
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

    const filtered = transactions.data.filter(t => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (categoryFilter && t.category !== categoryFilter) return false
        return true
    })

    function handleDelete(id: number) {
        if (!confirm('Excluir esta transação?')) return
        router.delete('/finance/transactions/' + id, {}, { preserveScroll: true })
    }

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
                <div className="flex rounded-lg overflow-hidden border border-slate-700">
                    {(['all', 'income', 'expense'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setTypeFilter(f)}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                typeFilter === f
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
                        </button>
                    ))}
                </div>

                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="">Todas as categorias</option>
                    {TRANSACTION_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Edit form inline above list */}
            {editingTransaction && (
                <TransactionForm
                    accountId={accountId}
                    transaction={editingTransaction}
                    onClose={() => setEditingTransaction(null)}
                />
            )}

            {/* Transaction rows */}
            {filtered.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nenhuma transação encontrada.</p>
            ) : (
                <div className="space-y-2">
                    {filtered.map(t => (
                        <div
                            key={t.id}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                            {/* Left */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-200 font-medium truncate">{t.description}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {t.category && (
                                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                                            {t.category}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-500">{fmtDate(t.occurred_at)}</span>
                                </div>
                            </div>

                            {/* Right */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type === 'income' ? '+' : '-'}{fmtBRL(t.amount)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingTransaction(t)}
                                >
                                    Editar
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(t.id)}
                                >
                                    Excluir
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {transactions.last_page > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-500">
                        Página {transactions.current_page} de {transactions.last_page}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={transactions.current_page <= 1}
                            onClick={() => router.get(window.location.pathname, { page: transactions.current_page - 1 })}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={transactions.current_page >= transactions.last_page}
                            onClick={() => router.get(window.location.pathname, { page: transactions.current_page + 1 })}
                        >
                            Próxima
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
