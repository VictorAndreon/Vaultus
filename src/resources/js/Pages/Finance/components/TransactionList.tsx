import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Transaction, PaginatedResponse } from '@/types'
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <div className="seg">
                    {(['all', 'income', 'expense'] as const).map(f => (
                        <button
                            key={f}
                            data-active={typeFilter === f}
                            onClick={() => setTypeFilter(f)}
                        >
                            {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
                        </button>
                    ))}
                </div>

                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="input"
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
                <div style={{ color: 'var(--text-4)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nenhuma transação encontrada.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(t => (
                        <div
                            key={t.id}
                            className="card"
                            style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                        >
                            {/* Left */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: 'var(--text)', fontSize: 13.5, fontWeight: 500 }}>{t.description}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                                    {t.category && (
                                        <span className="tag">{t.category}</span>
                                    )}
                                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-4)' }}>{fmtDate(t.occurred_at)}</span>
                                </div>
                            </div>

                            {/* Right */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--rose)' }}>
                                    {t.type === 'income' ? '+' : '-'}{fmtBRL(t.amount)}
                                </span>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingTransaction(t)}>
                                    Editar
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }} onClick={() => handleDelete(t.id)}>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {transactions.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
                        Página {transactions.current_page} de {transactions.last_page}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn btn-ghost btn-sm"
                            disabled={transactions.current_page <= 1}
                            onClick={() => router.get(window.location.pathname, { page: transactions.current_page - 1 })}
                        >
                            Anterior
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            disabled={transactions.current_page >= transactions.last_page}
                            onClick={() => router.get(window.location.pathname, { page: transactions.current_page + 1 })}
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
