import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Account, FinancialGoal, WishlistItem } from '@/types'
import AccountCard from './components/AccountCard'
import AccountForm from './components/AccountForm'
import GoalCard from './components/GoalCard'
import GoalForm from './components/GoalForm'
import WishlistCard from './components/WishlistCard'
import WishlistForm from './components/WishlistForm'
import Button from '@/Components/ui/Button'
import { router } from '@inertiajs/react'

interface Props {
    accounts: { data: Account[] }
    goals: { data: FinancialGoal[] }
    wishlist: { data: WishlistItem[] }
    net_worth: number
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

type Tab = 'goals' | 'wishlist'

export default function FinanceIndex({ accounts, goals, wishlist, net_worth }: Props) {
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const [showAccountForm, setShowAccountForm] = useState(false)
    const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
    const [showGoalForm, setShowGoalForm] = useState(false)
    const [editingWishlistItem, setEditingWishlistItem] = useState<WishlistItem | null>(null)
    const [showWishlistForm, setShowWishlistForm] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('goals')

    function deleteGoal(goal: FinancialGoal) {
        if (!confirm(`Excluir a meta "${goal.name}"?`)) return
        router.delete('/finance/goals/' + goal.id, {}, { preserveScroll: true })
    }

    function deleteWishlistItem(item: WishlistItem) {
        if (!confirm(`Excluir "${item.name}"?`)) return
        router.delete('/finance/wishlist/' + item.id, {}, { preserveScroll: true })
    }

    return (
        <AppLayout title="Finanças">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* Net Worth */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <p className="text-xs text-slate-500 mb-1">Patrimônio líquido</p>
                    <p className="text-3xl font-bold text-slate-100">{fmtBRL(net_worth)}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Accounts */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-300">Contas</h2>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => { setEditingAccount(null); setShowAccountForm(true) }}
                            >
                                Nova conta
                            </Button>
                        </div>
                        {accounts.data.length === 0 && (
                            <p className="text-xs text-slate-500">Nenhuma conta cadastrada.</p>
                        )}
                        {accounts.data.map(account => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onEdit={a => { setEditingAccount(a); setShowAccountForm(true) }}
                            />
                        ))}
                    </div>

                    {/* Right: Goals / Wishlist tabs */}
                    <div className="space-y-4">
                        {/* Tab buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('goals')}
                                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                    activeTab === 'goals'
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                Metas
                            </button>
                            <button
                                onClick={() => setActiveTab('wishlist')}
                                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                    activeTab === 'wishlist'
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                Wishlist
                            </button>
                        </div>

                        {activeTab === 'goals' && (
                            <div className="space-y-3">
                                <div className="flex justify-end">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => { setEditingGoal(null); setShowGoalForm(true) }}
                                    >
                                        Nova meta
                                    </Button>
                                </div>
                                {goals.data.length === 0 && (
                                    <p className="text-xs text-slate-500">Nenhuma meta cadastrada.</p>
                                )}
                                {goals.data.map(goal => (
                                    <GoalCard
                                        key={goal.id}
                                        goal={goal}
                                        onEdit={g => { setEditingGoal(g); setShowGoalForm(true) }}
                                        onDelete={deleteGoal}
                                    />
                                ))}
                            </div>
                        )}

                        {activeTab === 'wishlist' && (
                            <div className="space-y-3">
                                <div className="flex justify-end">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => { setEditingWishlistItem(null); setShowWishlistForm(true) }}
                                    >
                                        Novo item
                                    </Button>
                                </div>
                                {wishlist.data.length === 0 && (
                                    <p className="text-xs text-slate-500">Nenhum item na wishlist.</p>
                                )}
                                {wishlist.data.map(item => (
                                    <WishlistCard
                                        key={item.id}
                                        item={item}
                                        onEdit={i => { setEditingWishlistItem(i); setShowWishlistForm(true) }}
                                        onDelete={deleteWishlistItem}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAccountForm && (
                <AccountForm
                    account={editingAccount}
                    onClose={() => setShowAccountForm(false)}
                />
            )}
            {showGoalForm && (
                <GoalForm
                    goal={editingGoal}
                    onClose={() => setShowGoalForm(false)}
                />
            )}
            {showWishlistForm && (
                <WishlistForm
                    item={editingWishlistItem}
                    goals={goals.data}
                    onClose={() => setShowWishlistForm(false)}
                />
            )}
        </AppLayout>
    )
}
