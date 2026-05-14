import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import Button from '@/Components/ui/Button'
import { Account, Transaction, PaginatedResponse } from '@/types'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'

interface Props {
    account: { data: Account }
    transactions: PaginatedResponse<Transaction>
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const TYPE_LABELS: Record<string, string> = {
    checking: 'Corrente',
    savings: 'Poupança',
    investment: 'Investimento',
    cash: 'Dinheiro',
}

const TYPE_COLORS: Record<string, string> = {
    checking: 'var(--sky)',
    savings: 'var(--green)',
    investment: 'var(--purple, var(--sky))',
    cash: 'var(--text-4)',
}

export default function FinanceAccount({ account, transactions }: Props) {
    const [showTransactionForm, setShowTransactionForm] = useState(false)
    const acc = account.data

    return (
        <AppLayout title={acc.name}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Header card */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{acc.name}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 99,
                                    fontWeight: 500,
                                    background: `color-mix(in oklab, ${TYPE_COLORS[acc.type] ?? 'var(--text-4)'} 16%, transparent)`,
                                    color: TYPE_COLORS[acc.type] ?? 'var(--text-4)',
                                    border: `1px solid color-mix(in oklab, ${TYPE_COLORS[acc.type] ?? 'var(--text-4)'} 28%, transparent)`,
                                }}>
                                    {TYPE_LABELS[acc.type] ?? acc.type}
                                </span>
                                <span className="muted" style={{ fontSize: 12 }}>{acc.currency}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.015em' }}>{fmtBRL(acc.current_balance)}</div>
                </div>

                {/* Nova transação */}
                <div>
                    {!showTransactionForm && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowTransactionForm(true)}
                        >
                            + Nova transação
                        </Button>
                    )}

                    {showTransactionForm && (
                        <TransactionForm
                            accountId={acc.id}
                            transaction={null}
                            onClose={() => setShowTransactionForm(false)}
                        />
                    )}
                </div>

                {/* Transaction list */}
                <TransactionList transactions={transactions} accountId={acc.id} />
            </div>
        </AppLayout>
    )
}
