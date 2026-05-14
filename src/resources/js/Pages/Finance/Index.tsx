import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Account, FinancialGoal, WishlistItem } from '@/types'
import AccountCard from './components/AccountCard'
import AccountForm from './components/AccountForm'
import GoalCard from './components/GoalCard'
import GoalForm from './components/GoalForm'
import WishlistCard from './components/WishlistCard'
import WishlistForm from './components/WishlistForm'

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
    const [editingAccount, setEditingAccount]     = useState<Account | null>(null)
    const [showAccountForm, setShowAccountForm]   = useState(false)
    const [editingGoal, setEditingGoal]           = useState<FinancialGoal | null>(null)
    const [showGoalForm, setShowGoalForm]         = useState(false)
    const [editingWishlist, setEditingWishlist]   = useState<WishlistItem | null>(null)
    const [showWishlistForm, setShowWishlistForm] = useState(false)
    const [activeTab, setActiveTab]               = useState<Tab>('goals')

    function deleteGoal(goal: FinancialGoal) {
        if (!confirm(`Excluir a meta "${goal.name}"?`)) return
        router.delete('/finance/goals/' + goal.id, {}, { preserveScroll: true })
    }

    function deleteWishlistItem(item: WishlistItem) {
        if (!confirm(`Excluir "${item.name}"?`)) return
        router.delete('/finance/wishlist/' + item.id, {}, { preserveScroll: true })
    }

    return (
        <AppLayout
            title="Finanças"
            eyebrow="Patrimônio"
            subtitle="Saldo, fluxo, orçamento e metas."
            actions={
                <>
                    <div className="seg">
                        <button>Mês</button>
                        <button data-active="true">Trim.</button>
                        <button>Ano</button>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditingAccount(null); setShowAccountForm(true) }}>
                        <Icons.Plus size={13} /> Lançamento
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div className="grid g-4">
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Patrimônio Líquido</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{fmtBRL(net_worth)}</div>
                        <div className="stat-delta up"><Icons.ArrowUpRight size={11} /> +2,4% mês</div>
                    </div>
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Contas</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{accounts.data.length}<span className="unit">ativas</span></div>
                        <div className="stat-delta flat">ver detalhes</div>
                    </div>
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Metas</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{goals.data.length}<span className="unit">ativas</span></div>
                        <div className="stat-delta flat">ver metas</div>
                    </div>
                    <div className="stat" style={{ padding: '22px 24px' }}>
                        <div className="stat-label">Wishlist</div>
                        <div className="stat-value" style={{ fontSize: 32 }}>{wishlist.data.length}<span className="unit">itens</span></div>
                        <div className="stat-delta flat">ver wishlist</div>
                    </div>
                </div>

                {/* Contas + Metas/Wishlist */}
                <div className="grid g-2">
                    {/* Contas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="kicker" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Contas</span>
                            <button className="card-link" onClick={() => { setEditingAccount(null); setShowAccountForm(true) }}>
                                <Icons.Plus size={11} /> Nova conta
                            </button>
                        </div>
                        {accounts.data.length === 0 ? (
                            <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
                        ) : (
                            accounts.data.map(a => (
                                <AccountCard key={a.id} account={a} onEdit={ac => { setEditingAccount(ac); setShowAccountForm(true) }} />
                            ))
                        )}
                    </div>

                    {/* Metas / Wishlist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="seg">
                                <button data-active={activeTab === 'goals'} onClick={() => setActiveTab('goals')}>Metas</button>
                                <button data-active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')}>Wishlist</button>
                            </div>
                            {activeTab === 'goals' && (
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingGoal(null); setShowGoalForm(true) }}>
                                    <Icons.Plus size={12} /> Nova meta
                                </button>
                            )}
                            {activeTab === 'wishlist' && (
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingWishlist(null); setShowWishlistForm(true) }}>
                                    <Icons.Plus size={12} /> Novo item
                                </button>
                            )}
                        </div>

                        {activeTab === 'goals' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {goals.data.length === 0 ? (
                                    <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma meta cadastrada.</div>
                                ) : (
                                    goals.data.map(g => (
                                        <GoalCard key={g.id} goal={g} onEdit={go => { setEditingGoal(go); setShowGoalForm(true) }} onDelete={deleteGoal} />
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'wishlist' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {wishlist.data.length === 0 ? (
                                    <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum item na wishlist.</div>
                                ) : (
                                    wishlist.data.map(item => (
                                        <WishlistCard key={item.id} item={item} onEdit={i => { setEditingWishlist(i); setShowWishlistForm(true) }} onDelete={deleteWishlistItem} />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showAccountForm && <AccountForm account={editingAccount} onClose={() => setShowAccountForm(false)} />}
            {showGoalForm && <GoalForm goal={editingGoal} onClose={() => setShowGoalForm(false)} />}
            {showWishlistForm && <WishlistForm item={editingWishlist} goals={goals.data} onClose={() => setShowWishlistForm(false)} />}
        </AppLayout>
    )
}
