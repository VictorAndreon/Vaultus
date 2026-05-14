import { useState } from 'react'
import { router, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'

interface FinancialGoal {
  id: number; name: string; note: string | null
  icon: string; color: string; status: string
  target_amount: number; current_amount: number
  monthly_amount: number; suggested_monthly: number
  progress_percent: number; deadline: string | null
  months_left: number; is_completed: boolean; history: number[]
  category: string | null
}
interface BudgetEntry { id: number; name: string; color: string; spent: number; budget: number; pct: number }
interface FinanceTransaction { id: number; date: string; description: string; category: string; method: string; amount: number; type: 'income' | 'expense' }
interface DonutSegment { label: string; color: string; amount: number; pct: number }
interface FlowChart { labels: string[]; income: number[]; expense: number[] }

interface Props {
  net_worth: number; month_income: number; month_expense: number; savings_rate: number
  flow_chart: FlowChart; donut: DonutSegment[]; budgets: BudgetEntry[]
  transactions: FinanceTransaction[]; goals: FinancialGoal[]; month_label: string
}

function fmtBRL(v: number, compact = false) {
  if (compact && Math.abs(v) >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function FlowAreaChart({ income, expense, labels, h = 160 }: { income: number[]; expense: number[]; labels: string[]; h?: number }) {
  const w = 600, pad = 24
  const allVals = [...income, ...expense]
  if (allVals.length === 0) return null
  const min = Math.min(...allVals) * 0.9
  const max = Math.max(...allVals) * 1.1 || 1
  const range = max - min || 1
  const toLine = (data: number[]) => data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    h - 24 - ((v - min) / range) * (h - 48),
  ] as [number, number]).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {[0,1,2,3].map(i => <line key={i} x1={pad} x2={w-pad} y1={24+i*((h-48)/3)} y2={24+i*((h-48)/3)} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />)}
      <path d={toLine(income)} fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toLine(expense)} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />
      {labels.map((l, i) => {
        const x = pad + (i / (labels.length - 1)) * (w - pad * 2)
        return <text key={i} x={x} y={h-6} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
      })}
    </svg>
  )
}

function DonutChart({ segments, center }: { segments: DonutSegment[]; center: { label: string; value: string } }) {
  const r = 60, c = 2 * Math.PI * r
  let acc = 0
  const total = segments.reduce((s, x) => s + x.pct, 0) || 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width="160" height="160" viewBox="-80 -80 160 160" style={{ transform: 'rotate(-90deg)', flex: 'none' }}>
        <circle r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
        {segments.map((s, i) => {
          const len = (s.pct / total) * c
          const off = c - acc; acc += len
          return <circle key={i} r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`} strokeDashoffset={off.toFixed(2)} />
        })}
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="kicker">{center.label}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--text)', marginTop: 2 }}>{center.value}</div>
        </div>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flex: 'none' }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <span className="mono muted">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Sparkline({ data, color = 'var(--green)', w = 140, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(1)}`).join(' ')
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function GoalIcon({ name, size = 20 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'Home':  return <svg {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
    case 'Plane': return <svg {...p}><path d="M3 14l8-1 4-9 2 1-2 8 7-1 1 2-6 3-2 8-2-1 1-7-7 1z"/></svg>
    case 'Car':   return <svg {...p}><path d="M4 16v-3l2-5h12l2 5v3"/><rect x="2" y="13" width="20" height="5" rx="1"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>
    default:      return <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/></svg>
  }
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  'no-prazo':  { label: 'No prazo',  cls: 'tag-green' },
  'atencao':   { label: 'Atenção',   cls: 'tag-gold'  },
  'atrasado':  { label: 'Atrasado',  cls: 'tag-rose'  },
  'concluida': { label: 'Concluída', cls: 'tag-sky'   },
}

function GoalCard({ g, onAporte }: { g: FinancialGoal; onAporte: () => void }) {
  const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
  const remaining = g.target_amount - g.current_amount
  const monthsToFinish = g.monthly_amount > 0 ? Math.ceil(remaining / g.monthly_amount) : null
  const status = STATUS_MAP[g.status] ?? STATUS_MAP['no-prazo']
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in oklab, ${g.color} 16%, transparent)`, color: g.color, display: 'grid', placeItems: 'center', border: `1px solid color-mix(in oklab, ${g.color} 32%, transparent)`, flex: 'none' }}>
          <GoalIcon name={g.icon} size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{g.name}</div>
            <span className={`tag ${status.cls}`}><span className="dot" />{status.label}</span>
          </div>
          {g.note && <div className="muted" style={{ fontSize: 12 }}>{g.note}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1 }}>{fmtBRL(g.current_amount)}</div>
        <div className="mono muted" style={{ fontSize: 13 }}>de {fmtBRL(g.target_amount)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="meter" style={{ flex: 1, height: 6 }}><span style={{ width: pct + '%', background: g.color }} /></div>
        <span className="mono" style={{ fontSize: 13, color: g.color }}>{pct}%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, paddingTop: 14, paddingBottom: 14, borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', marginBottom: 14 }}>
        <div><div className="kicker" style={{ fontSize: 9.5 }}>Aporte mensal</div><div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{fmtBRL(g.monthly_amount)}</div>{g.suggested_monthly > g.monthly_amount && <div className="muted" style={{ fontSize: 10.5, marginTop: 2, color: 'var(--gold)' }}>↑ ideal {fmtBRL(g.suggested_monthly)}</div>}</div>
        <div><div className="kicker" style={{ fontSize: 9.5 }}>Falta</div><div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{fmtBRL(remaining, true)}</div>{monthsToFinish && <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{monthsToFinish} meses</div>}</div>
        <div><div className="kicker" style={{ fontSize: 9.5 }}>Prazo</div><div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{g.deadline ?? '—'}</div>{g.months_left > 0 && <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{g.months_left} meses</div>}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}><div className="kicker" style={{ fontSize: 9.5, marginBottom: 4 }}>Evolução · 12 meses</div><Sparkline data={g.history.length > 1 ? g.history : [0, g.current_amount / 1000]} color={g.color} /></div>
        <button className="btn btn-primary btn-sm" onClick={onAporte}><Icons.Plus size={12} /> Aportar</button>
      </div>
    </div>
  )
}

function AporteModal({ goal, onClose, onSave }: { goal: FinancialGoal; onClose: () => void; onSave: (v: number) => void }) {
  const [amount, setAmount] = useState(goal.monthly_amount > 0 ? String(goal.monthly_amount) : '')
  function submit(e: React.FormEvent) { e.preventDefault(); const v = parseFloat(amount.replace(',', '.')); if (!isNaN(v) && v > 0) onSave(v) }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div className="kicker">Aportar · {goal.name}</div><div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Registrar aporte</div></div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '22px 26px' }}>
          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Valor do aporte (R$)</label>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--mono)' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Confirmar aporte</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinanceIndex({ net_worth, month_income, month_expense, savings_rate, flow_chart, donut, budgets, transactions, goals, month_label }: Props) {
  const [goalFilter, setGoalFilter] = useState<'todas' | 'no-prazo' | 'atencao' | 'atrasado'>('todas')
  const [aporteGoal, setAporteGoal] = useState<FinancialGoal | null>(null)

  const filteredGoals = goalFilter === 'todas' ? goals : goals.filter(g => g.status === goalFilter)
  const totalCurrent  = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget   = goals.reduce((s, g) => s + g.target_amount, 0)
  const totalPct      = totalTarget > 0 ? Math.round(totalCurrent / totalTarget * 100) : 0
  const totalMonthly  = goals.reduce((s, g) => s + g.monthly_amount, 0)

  function handleAporte(amount: number) {
    if (!aporteGoal) return
    router.post(`/finance/goals/${aporteGoal.id}/deposit`, { amount }, {
      preserveScroll: true, onSuccess: () => setAporteGoal(null),
    })
  }

  return (
    <AppLayout title="Finanças" eyebrow="Patrimônio" subtitle="Saldo, fluxo, orçamento e metas."
      actions={
        <button className="btn btn-primary btn-sm"><Icons.Plus size={13} /> Lançamento</button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* BigStat cards */}
        <div className="grid g-4">
          {[
            { label: 'Patrimônio Líquido', value: fmtBRL(net_worth), sub: 'acumulado', dir: 'up' },
            { label: `Receitas · ${month_label}`, value: fmtBRL(month_income), sub: 'este mês', dir: 'up' },
            { label: `Despesas · ${month_label}`, value: fmtBRL(month_expense), sub: 'este mês', dir: 'flat' },
            { label: 'Taxa de poupança', value: savings_rate.toLocaleString('pt-BR') + '%', sub: 'meta 40%', dir: savings_rate >= 20 ? 'up' : 'flat' },
          ].map((s, i) => (
            <div key={i} className="stat" style={{ padding: '22px 24px' }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
              <div className={`stat-delta ${s.dir}`} style={{ marginTop: 4 }}>{s.dir === 'up' && <Icons.ArrowUpRight size={11} />}{s.sub}</div>
            </div>
          ))}
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
            <FlowAreaChart income={flow_chart.income} expense={flow_chart.expense} labels={flow_chart.labels} />
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Alocação patrimônio</div></div>
            {donut.length > 0
              ? <DonutChart segments={donut} center={{ label: 'Total', value: fmtBRL(net_worth, true) }} />
              : <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
            }
          </div>
        </div>

        {/* Orçamentos */}
        {budgets.length > 0 && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Orçamentos · <b>{month_label}</b></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {budgets.map((c, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                      <span style={{ fontSize: 13.5 }}>{c.name}</span>
                      <span className="mono" style={{ fontSize: 11, color: c.pct > 90 ? 'var(--rose)' : 'var(--text-4)' }}>{c.pct}%</span>
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      <span style={{ color: 'var(--text)' }}>{fmtBRL(c.spent)}</span> / {fmtBRL(c.budget)}
                    </div>
                  </div>
                  <div className="meter"><span style={{ width: Math.min(100, c.pct) + '%', background: c.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metas financeiras */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="kicker" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span>Metas Financeiras · <b style={{ color: 'var(--text-2)' }}>{goals.length}</b></span>
              <span style={{ color: 'var(--text-4)' }}>·</span>
              <span>Aporte mensal <b className="mono" style={{ color: 'var(--green)' }}>{fmtBRL(totalMonthly)}</b></span>
            </div>
            <div className="seg">
              {(['todas', 'no-prazo', 'atencao', 'atrasado'] as const).map(f => (
                <button key={f} data-active={goalFilter === f} onClick={() => setGoalFilter(f)}>
                  {f === 'todas' ? 'Todas' : f === 'no-prazo' ? 'No prazo' : f === 'atencao' ? 'Atenção' : 'Atrasado'}
                </button>
              ))}
            </div>
          </div>

          {/* Banner de progresso total */}
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
            {filteredGoals.map(g => <GoalCard key={g.id} g={g} onAporte={() => setAporteGoal(g)} />)}
          </div>
        </section>

        {/* Tabela de lançamentos */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Lançamentos recentes</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 140px 180px 120px', padding: '10px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
            <div>Data</div><div>Descrição</div><div>Categoria</div><div>Método</div><div style={{ textAlign: 'right' }}>Valor</div>
          </div>
          {transactions.length === 0
            ? <div style={{ padding: 24, color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum lançamento.</div>
            : transactions.map((t, i) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 140px 180px 120px', padding: '12px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13 }}>
                <div className="mono muted" style={{ fontSize: 11 }}>{t.date}</div>
                <div>{t.description}</div>
                <div className="muted">{t.category}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{t.method}</div>
                <div className="mono" style={{ textAlign: 'right', color: t.type === 'income' ? 'var(--success)' : 'var(--text)', fontWeight: 500 }}>
                  {t.type === 'income' ? '+' : '−'} {fmtBRL(Math.abs(t.amount))}
                </div>
              </div>
            ))
          }
        </div>

      </div>

      {aporteGoal && <AporteModal goal={aporteGoal} onClose={() => setAporteGoal(null)} onSave={handleAporte} />}
    </AppLayout>
  )
}
