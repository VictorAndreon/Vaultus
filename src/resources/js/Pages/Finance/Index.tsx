import { useState } from 'react'
import { router, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { idempotentPost } from '@/lib/idempotentPost'
import { fmtBRL } from '@/lib/finance/formatters'
import { FinanceIndexProps, FinancialGoal, FinanceTransaction, UpcomingPayment, WishlistItem } from '@/types/finance'

// Charts
import AreaChart from '@/Components/charts/AreaChart'
import Donut from '@/Components/charts/Donut'

// Goals
import GoalCard from './components/goals/GoalCard'
import GoalModal from './components/goals/GoalModal'
import AporteModal from './components/goals/AporteModal'

// Outros modais
import AccountModal from './components/accounts/AccountModal'
import BudgetModal from './components/budgets/BudgetModal'
import UpcomingPaymentModal from './components/upcoming/UpcomingPaymentModal'
import TransactionModal from './components/transactions/TransactionModal'
import WishlistModal from './components/wishlist/WishlistModal'
import { useConfirm } from '@/Components/dialogs/DialogProvider'

export default function FinanceIndex({
  net_worth, month_income, month_expense, savings_rate, savings_goal_pct,
  flow_chart, donut, budgets, transactions, goals, month_label,
  accounts_list, upcoming_payments, wishlist, budget_category_names,
  period_from, period_to, period_is_default,
}: FinanceIndexProps) {
  const confirm = useConfirm()
  const [goalFilter, setGoalFilter] = useState<'todas' | 'no-prazo' | 'atencao' | 'atrasado'>('todas')
  const [aporteGoal, setAporteGoal] = useState<FinancialGoal | null>(null)
  const [goalModal, setGoalModal] = useState<{ goal: FinancialGoal | null } | null>(null)
  const [txModal, setTxModal] = useState<{ tx: FinanceTransaction | null } | null>(null)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [upcomingModal, setUpcomingModal] = useState<{ payment: UpcomingPayment | null } | null>(null)
  const [wishlistModal, setWishlistModal] = useState<{ item: WishlistItem | null } | null>(null)
  const [editSavingsPct, setEditSavingsPct] = useState(false)
  const [savingsPctInput, setSavingsPctInput] = useState(savings_goal_pct)

  const filteredGoals = goalFilter === 'todas' ? goals : goals.filter(g => g.status === goalFilter)
  const totalCurrent  = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget   = goals.reduce((s, g) => s + g.target_amount, 0)
  const totalPct      = totalTarget > 0 ? Math.round(totalCurrent / totalTarget * 100) : 0
  const totalMonthly  = goals.reduce((s, g) => s + g.monthly_amount, 0)

  function handleAporte({ amount, accountId }: { amount: number; accountId: number }) {
    if (!aporteGoal) return
    idempotentPost(`/finance/goals/${aporteGoal.id}/deposit`, { amount, account_id: accountId }, {
      preserveScroll: true, onSuccess: () => setAporteGoal(null),
    })
  }

  async function handleDeleteGoal(g: FinancialGoal) {
    if (!(await confirm({ title: `Excluir a meta "${g.name}"?`, variant: 'danger', confirmText: 'Excluir' }))) return
    router.delete(`/finance/goals/${g.id}`, { preserveScroll: true })
  }

  return (
    <AppLayout title="Finanças" eyebrow="Patrimônio" subtitle="Saldo, fluxo, orçamento e metas."
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!period_is_default && (
            <span className="tag tag-gold" style={{ fontSize: 10 }}>
              <span className="dot" /> {period_from} → {period_to}
              <button
                type="button"
                onClick={() => router.get('/finance', {}, { preserveScroll: true })}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 6, padding: 0 }}
              >
                <Icons.X size={9} />
              </button>
            </span>
          )}
          <Link href="/finance/cards" className="btn btn-ghost btn-sm">
            <Icons.Tag size={13} /> Cartões
          </Link>
          <Link href="/finance/recurring" className="btn btn-ghost btn-sm">
            <Icons.Clock size={13} /> Recorrências
          </Link>
          <Link href="/finance/reports" className="btn btn-ghost btn-sm">
            <Icons.Trend size={13} /> Relatórios
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => setTxModal({ tx: null })}>
            <Icons.Plus size={13} /> Lançamento
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* BigStat cards */}
        <div className="grid g-4">
          {[
            { label: 'Patrimônio Líquido', value: fmtBRL(net_worth), sub: 'acumulado', dir: 'up' },
            { label: `Receitas · ${month_label}`, value: fmtBRL(month_income), sub: 'este mês', dir: 'up' },
            { label: `Despesas · ${month_label}`, value: fmtBRL(month_expense), sub: 'este mês', dir: 'flat' },
          ].map((s, i) => (
            <div key={i} className="stat" style={{ padding: '22px 24px' }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
              <div className={`stat-delta ${s.dir}`} style={{ marginTop: 4 }}>{s.dir === 'up' && <Icons.ArrowUpRight size={11} />}{s.sub}</div>
            </div>
          ))}
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Taxa de poupança</div>
            <div className="stat-value" style={{ fontSize: 28 }}>{savings_rate.toLocaleString('pt-BR')}%</div>
            <div className={`stat-delta ${savings_rate >= savings_goal_pct ? 'up' : 'flat'}`} style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {savings_rate >= savings_goal_pct && <Icons.ArrowUpRight size={11} />}
              {editSavingsPct ? (
                <form onSubmit={e => { e.preventDefault(); router.patch('/finance/settings', { savings_goal_pct: savingsPctInput }, { preserveScroll: true, onSuccess: () => setEditSavingsPct(false) }) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>meta</span>
                  <input type="number" min="1" max="100" value={savingsPctInput} onChange={e => setSavingsPctInput(Number(e.target.value))}
                    style={{ width: 42, fontFamily: 'var(--mono)', fontSize: 11, border: '1px solid var(--line)', borderRadius: 4, padding: '1px 5px', background: 'var(--surface)', color: 'var(--text)' }} autoFocus />
                  <span>%</span>
                  <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 0, display: 'flex' }}><Icons.Check size={11} /></button>
                  <button type="button" onClick={() => { setEditSavingsPct(false); setSavingsPctInput(savings_goal_pct) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, display: 'flex' }}><Icons.X size={11} /></button>
                </form>
              ) : (
                <button type="button" onClick={() => setEditSavingsPct(true)}
                  title="Clique para editar a meta"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}>
                  meta {savings_goal_pct}%
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fluxo + Donut */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="kicker" style={{ marginBottom: 6 }}>Fluxo · últimos 12 meses</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                  <h2 className="h-display">Receitas vs. Despesas</h2>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                    <span><span style={{ display: 'inline-block', width: 8, height: 2, background: 'var(--green)', verticalAlign: 'middle', marginRight: 4 }} />Receita</span>
                    <span><span style={{ display: 'inline-block', width: 8, height: 2, background: 'var(--gold)', verticalAlign: 'middle', marginRight: 4 }} />Despesa</span>
                  </div>
                </div>
              </div>
            </div>
            <AreaChart
              height={160}
              gridlines
              showTooltip
              dual={{
                income: flow_chart.income,
                expense: flow_chart.expense,
                labels: flow_chart.labels,
                format: (n) => fmtBRL(n),
              }}
            />
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Alocação patrimônio</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAccountModal(true)}>
                <Icons.Plus size={12} /> Nova Conta
              </button>
            </div>
            {donut.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <Donut
                  size={160}
                  thickness={14}
                  data={donut.map(s => ({ label: s.label, value: s.pct, color: s.color }))}
                  center={
                    <div>
                      <div className="kicker">Total</div>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)', marginTop: 2 }}>
                        {fmtBRL(net_worth, true)}
                      </div>
                    </div>
                  }
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  {donut.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flex: 'none' }} />
                      <span style={{ flex: 1 }}>{s.label}</span>
                      <span className="mono muted">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
            )}
          </div>
        </div>

        {/* Orçamentos + Próximos Pagamentos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head" style={{ marginBottom: 16 }}>
              <div className="card-title">Orçamentos · <b>{month_label}</b></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBudgetModal(true)}>
                Ajustar
              </button>
            </div>
            {budgets.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
                Nenhum orçamento. Clique em Ajustar para criar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {budgets.map((c, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flex: 'none', marginRight: 8 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{c.name}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 6 }}>{c.pct}%</span>
                      <div className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
                        <span style={{ color: c.budget > 0 && c.pct >= 100 ? 'var(--rose)' : 'var(--text-2)', fontWeight: 500 }}>{fmtBRL(c.spent)}</span>
                        {c.budget > 0 ? <> / {fmtBRL(c.budget)}</> : <span style={{ color: 'var(--text-4)' }}> · sem limite</span>}
                      </div>
                    </div>
                    {c.budget > 0 && (
                      <div className="meter"><span style={{ width: Math.min(100, c.pct) + '%', background: c.pct >= 100 ? 'var(--rose)' : c.color }} /></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Próximos Pagamentos</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setUpcomingModal({ payment: null })}>
                <Icons.Plus size={12} />
              </button>
            </div>
            {upcoming_payments.length === 0 ? (
              <div style={{ padding: '0 22px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum pagamento agendado.</div>
            ) : (
              <div>
                {upcoming_payments.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 22px', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                    <div className="mono muted" style={{ fontSize: 11, flex: 'none', width: 44 }}>{p.due_label}</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.description}
                      {p.days_until <= 3 && (
                        <span className="tag tag-rose" style={{ fontSize: 10 }}>{p.days_until}d</span>
                      )}
                      {p.tag === 'meta' && (
                        <span className="tag tag-green" style={{ fontSize: 10 }}><span className="dot" />meta</span>
                      )}
                    </div>
                    <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500, flex: 'none' }}>{fmtBRL(p.amount)}</div>
                    <button className="icon-btn" style={{ width: 24, height: 24, flex: 'none' }} onClick={() => setUpcomingModal({ payment: p })}>
                      <Icons.Edit size={11} />
                    </button>
                    <button className="icon-btn" style={{ width: 24, height: 24, flex: 'none', color: 'var(--rose)' }} onClick={async () => {
                      if (await confirm({ title: `Remover "${p.description}"?`, variant: 'danger', confirmText: 'Remover' })) router.delete(`/finance/upcoming-payments/${p.id}`, { preserveScroll: true })
                    }}>
                      <Icons.Trash size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metas financeiras */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="kicker" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span>Metas Financeiras · <b style={{ color: 'var(--text-2)' }}>{goals.length}</b></span>
              <span style={{ color: 'var(--text-4)' }}>·</span>
              <span>Aporte mensal <b className="mono" style={{ color: 'var(--green)' }}>{fmtBRL(totalMonthly)}</b></span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setGoalModal({ goal: null })}>
                <Icons.Plus size={12} /> Nova Meta
              </button>
              <div className="seg">
                {(['todas', 'no-prazo', 'atencao', 'atrasado'] as const).map(f => (
                  <button key={f} data-active={goalFilter === f} onClick={() => setGoalFilter(f)}>
                    {f === 'todas' ? 'Todas' : f === 'no-prazo' ? 'No prazo' : f === 'atencao' ? 'Atenção' : 'Atrasado'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 28, alignItems: 'center' }}>
              <div>
                <div className="kicker">Progresso total</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--text)', letterSpacing: '-0.015em' }}>{fmtBRL(totalCurrent, true)}</div>
                  <div className="mono muted" style={{ fontSize: 13 }}>/ {fmtBRL(totalTarget, true)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <div className="meter" style={{ flex: 1 }}><span style={{ width: totalPct + '%' }} /></div>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--green)' }}>{totalPct}%</span>
                </div>
              </div>
              <div>
                <div className="kicker">Em andamento</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 4 }}>{goals.filter(g => g.status !== 'concluida').length}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{goals.filter(g => g.status === 'no-prazo').length} no prazo</div>
              </div>
              <div>
                <div className="kicker">Em atenção</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 4, color: 'var(--gold)' }}>{goals.filter(g => g.status === 'atencao' || g.status === 'atrasado').length}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>precisam de ajuste</div>
              </div>
              <div>
                <div className="kicker">Aporte sugerido</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 4 }}>{fmtBRL(goals.reduce((s, g) => s + g.suggested_monthly, 0))}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>atual {fmtBRL(totalMonthly)}</div>
              </div>
            </div>
          </div>

          <div className="grid g-2">
            {filteredGoals.map(g => (
              <GoalCard
                key={g.id}
                g={g}
                onAporte={() => setAporteGoal(g)}
                onEdit={() => setGoalModal({ goal: g })}
                onDelete={() => handleDeleteGoal(g)}
              />
            ))}
          </div>
        </section>

        {/* Lista de desejos */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="kicker">
              Lista de desejos · <b style={{ color: 'var(--text-2)' }}>{wishlist.length}</b>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setWishlistModal({ item: null })}>
              <Icons.Plus size={12} /> Novo desejo
            </button>
          </div>

          {wishlist.length === 0 ? (
            <div className="card" style={{ padding: 20, color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
              Nenhum desejo cadastrado. Use para registrar coisas que você quer comprar e vinculá-las a metas.
            </div>
          ) : (
            <div className="grid g-3">
              {wishlist.map(w => {
                const prioCls   = w.priority === 'high' ? 'tag-rose' : w.priority === 'medium' ? 'tag-gold' : 'tag'
                const prioLabel = w.priority === 'high' ? 'Alta' : w.priority === 'medium' ? 'Média' : 'Baixa'
                return (
                  <div key={w.id} className="card" style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{w.name}</span>
                          <span className={`tag ${prioCls}`}><span className="dot" />{prioLabel}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)' }}>
                          {w.estimated_price != null ? fmtBRL(w.estimated_price) : '—'}
                        </div>
                        {w.goal_name && (
                          <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>→ Meta: {w.goal_name}</div>
                        )}
                        {w.url && (
                          <a href={w.url} target="_blank" rel="noopener noreferrer" className="card-link" style={{ fontSize: 12, marginTop: 6, display: 'inline-block' }}>Abrir link ↗</a>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
                        <button className="icon-btn" title="Editar" style={{ width: 26, height: 26 }} onClick={() => setWishlistModal({ item: w })}>
                          <Icons.Edit size={11} />
                        </button>
                        <button
                          className="icon-btn"
                          title="Excluir"
                          style={{ width: 26, height: 26, color: 'var(--rose)' }}
                          onClick={async () => {
                            if (await confirm({ title: `Excluir "${w.name}"?`, variant: 'danger', confirmText: 'Excluir' })) {
                              router.delete(`/finance/wishlist/${w.id}`, { preserveScroll: true })
                            }
                          }}
                        >
                          <Icons.Trash size={11} />
                        </button>
                      </div>
                    </div>
                    {w.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
                        {w.notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Tabela de lançamentos */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Lançamentos recentes</div>
            <Link href="/finance/transactions" className="btn btn-ghost btn-sm">
              Ver tudo →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 140px 180px 110px 60px', padding: '10px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
            <div>Data</div><div>Descrição</div><div>Categoria</div><div>Método</div><div style={{ textAlign: 'right' }}>Valor</div><div></div>
          </div>
          {transactions.length === 0
            ? <div style={{ padding: 24, color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum lançamento.</div>
            : transactions.map((t, i) => {
              const sign  = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔'
              const color = t.type === 'income' ? 'var(--success)' : t.type === 'expense' ? 'var(--rose)' : 'var(--text-3)'
              const canEdit = t.type !== 'transfer'
              return (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 140px 180px 110px 60px', padding: '12px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13 }}>
                  <div className="mono muted" style={{ fontSize: 11 }}>{t.date}</div>
                  <div>{t.description}</div>
                  <div className="muted">{t.category}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{t.method}</div>
                  <div className="mono" style={{ textAlign: 'right', color, fontWeight: 500 }}>
                    {sign} {fmtBRL(Math.abs(t.amount))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {canEdit && (
                      <button className="icon-btn" title="Editar" style={{ width: 24, height: 24 }} onClick={() => setTxModal({ tx: t })}>
                        <Icons.Edit size={11} />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      title="Excluir"
                      style={{ width: 24, height: 24, color: 'var(--rose)' }}
                      onClick={async () => {
                        if (await confirm({ title: `Excluir "${t.description}"?`, variant: 'danger', confirmText: 'Excluir' })) {
                          router.delete(`/finance/transactions/${t.id}`, { preserveScroll: true })
                        }
                      }}
                    >
                      <Icons.Trash size={11} />
                    </button>
                  </div>
                </div>
              )
            })
          }
        </div>

      </div>

      {goalModal !== null && (
        <GoalModal goal={goalModal.goal} onClose={() => setGoalModal(null)} />
      )}
      {aporteGoal && <AporteModal goal={aporteGoal} accounts={accounts_list} onClose={() => setAporteGoal(null)} onSave={handleAporte} />}
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} />}
      {txModal !== null && (
        <TransactionModal
          accounts={accounts_list}
          budgetCategories={budget_category_names}
          transaction={txModal.tx}
          onClose={() => setTxModal(null)}
        />
      )}
      {showBudgetModal && <BudgetModal budgets={budgets} onClose={() => setShowBudgetModal(false)} />}
      {upcomingModal !== null && (
        <UpcomingPaymentModal
          payment={upcomingModal.payment}
          goals={goals}
          onClose={() => setUpcomingModal(null)}
        />
      )}
      {wishlistModal !== null && (
        <WishlistModal
          item={wishlistModal.item}
          goals={goals}
          onClose={() => setWishlistModal(null)}
        />
      )}
    </AppLayout>
  )
}
