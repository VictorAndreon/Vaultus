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

const TYPE_BADGE: Record<string, string> = {
    checking: 'bg-blue-600/20 text-blue-400',
    savings: 'bg-green-600/20 text-green-400',
    investment: 'bg-purple-600/20 text-purple-400',
    cash: 'bg-slate-700 text-slate-400',
}

export default function FinanceAccount({ account, transactions }: Props) {
    const [showTransactionForm, setShowTransactionForm] = useState(false)
    const acc = account.data

    return (
        <AppLayout title={acc.name}>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-100">{acc.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[acc.type] ?? 'bg-slate-700 text-slate-400'}`}>
                                    {TYPE_LABELS[acc.type] ?? acc.type}
                                </span>
                                <span className="text-xs text-slate-500">{acc.currency}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-100">{fmtBRL(acc.current_balance)}</p>
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
