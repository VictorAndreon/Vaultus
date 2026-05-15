import { useState } from 'react'
import { router, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'

interface FinancialGoal {
  id: number; name: string; note: string | null
  icon: string; color: string; status: string
  target_amount: number; current_amount: number
  monthly_amount: number; suggested_monthly: number
  progress_percent: number
  deadline: string | null      // formato 'Y-m', ex: '2026-12'
  deadline_label: string | null // ex: 'Dez 2026'
  months_left: number; is_completed: boolean; history: number[]
  category: string | null
}

interface AccountItem { id: number; name: string; type: string }

interface BudgetEntry { id: number; name: string; color: string; spent: number; budget: number; pct: number }
interface FinanceTransaction { id: number; date: string; description: string; category: string; method: string; amount: number; type: 'income' | 'expense' }
interface DonutSegment { label: string; color: string; amount: number; pct: number }
interface FlowChart { labels: string[]; income: number[]; expense: number[] }

interface UpcomingPayment {
  id: number; description: string; amount: number
  due_date: string; due_label: string; days_until: number
  tag: string | null; linked_goal_id: number | null
}

interface Props {
  net_worth: number; month_income: number; month_expense: number; savings_rate: number
  savings_goal_pct: number
  flow_chart: FlowChart; donut: DonutSegment[]; budgets: BudgetEntry[]
  transactions: FinanceTransaction[]; goals: FinancialGoal[]; month_label: string
  accounts_list: AccountItem[]
  upcoming_payments: UpcomingPayment[]
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

const GOAL_ICONS = ['🏠','✈️','🚗','🎓','💍','🏖','💼','🏥','📱','🐶','🌱','🛡','⭐','🎮','🔧','💰']
const GOAL_COLORS = [
  { label: 'Verde',  value: 'var(--green)'  },
  { label: 'Dourado',value: 'var(--gold)'   },
  { label: 'Azul',   value: 'var(--sky)'    },
  { label: 'Rosa',   value: 'var(--rose)'   },
  { label: 'Roxo',   value: 'var(--purple, oklch(72% 0.12 290))' },
  { label: 'Teal',   value: 'var(--teal, oklch(76% 0.12 195))'   },
]

function GoalCard({ g, onAporte, onEdit, onDelete }: {
  g: FinancialGoal
  onAporte: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
  const remaining = g.target_amount - g.current_amount
  const monthsToFinish = g.monthly_amount > 0 ? Math.ceil(remaining / g.monthly_amount) : null
  const status = STATUS_MAP[g.status] ?? STATUS_MAP['no-prazo']
  const isOnPlan = g.monthly_amount >= g.suggested_monthly || g.suggested_monthly === 0

  return (
    <div className="card" style={{ padding: 22, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in oklab, ${g.color} 16%, transparent)`, color: g.color, display: 'grid', placeItems: 'center', fontSize: 20, border: `1px solid color-mix(in oklab, ${g.color} 32%, transparent)`, flex: 'none' }}>
          {GOAL_ICONS.includes(g.icon) ? g.icon : '🛡'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{g.name}</span>
            <span className={`tag ${status.cls}`}><span className="dot" />{status.label}</span>
          </div>
          {g.note && <div className="muted" style={{ fontSize: 12 }}>{g.note}</div>}
        </div>
        {/* Kebab menu */}
        <div style={{ position: 'relative', flex: 'none' }}>
          <button
            className="icon-btn"
            style={{ width: 28, height: 28, fontSize: 14, letterSpacing: 1 }}
            onClick={() => setMenuOpen(o => !o)}
          >···</button>
          {menuOpen && (
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          )}
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 34, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', zIndex: 20, minWidth: 110, boxShadow: 'var(--shadow-2)' }}>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start', padding: '9px 14px' }} onClick={() => { setMenuOpen(false); onEdit() }}>
                <Icons.Edit size={12} /> Editar
              </button>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start', padding: '9px 14px', color: 'var(--rose)' }} onClick={() => { setMenuOpen(false); onDelete() }}>
                <Icons.Trash size={12} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmtBRL(g.current_amount)}</div>
        <div className="mono muted" style={{ fontSize: 13 }}>de {fmtBRL(g.target_amount)}</div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="meter" style={{ flex: 1, height: 5 }}><span style={{ width: pct + '%', background: g.color }} /></div>
        <span className="mono" style={{ fontSize: 13, color: g.color, fontWeight: 500 }}>{pct}%</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, paddingTop: 14, paddingBottom: 14, borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', marginBottom: 14 }}>
        <div>
          <div className="kicker" style={{ fontSize: 9.5 }}>Aporte mensal</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{fmtBRL(g.monthly_amount)}</div>
          <div style={{ fontSize: 10.5, marginTop: 2, color: isOnPlan ? 'var(--green)' : 'var(--gold)' }}>
            {isOnPlan ? 'no plano' : `↑ ideal ${fmtBRL(g.suggested_monthly)}`}
          </div>
        </div>
        <div>
          <div className="kicker" style={{ fontSize: 9.5 }}>Falta</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{fmtBRL(remaining, true)}</div>
          {monthsToFinish && <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{monthsToFinish} meses no ritmo</div>}
        </div>
        <div>
          <div className="kicker" style={{ fontSize: 9.5 }}>Prazo</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{g.deadline_label ?? '—'}</div>
          {g.months_left > 0 && <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{g.months_left} meses restantes</div>}
        </div>
      </div>

      {/* Footer: sparkline + lápis + aportar */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="kicker" style={{ fontSize: 9.5, marginBottom: 6 }}>Evolução · 12 meses</div>
          <Sparkline data={g.history.length > 1 ? g.history : [0, g.current_amount / 1000]} color={g.color} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={onEdit}>
            <Icons.Edit size={13} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={onAporte}><Icons.Plus size={12} /> Aportar</button>
        </div>
      </div>
    </div>
  )
}

function AporteModal({ goal, onClose, onSave }: { goal: FinancialGoal; onClose: () => void; onSave: (v: number) => void }) {
  const [amount, setAmount] = useState(goal.monthly_amount > 0 ? goal.monthly_amount : 0)
  function submit(e: React.FormEvent) { e.preventDefault(); if (amount > 0) onSave(amount) }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div className="kicker">Aportar · {goal.name}</div><div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Registrar aporte</div></div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '22px 26px' }}>
          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Valor do aporte (R$)</label>
          <CurrencyInput value={amount} onValueChange={setAmount} autoFocus style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--mono)' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Confirmar aporte</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GoalModal({ goal, onClose }: { goal: FinancialGoal | null; onClose: () => void }) {
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? '🛡')
  const [color, setColor] = useState(goal?.color ?? 'var(--green)')
  const [targetAmount, setTargetAmount] = useState(goal ? goal.target_amount : 0)
  const [monthlyAmount, setMonthlyAmount] = useState(goal ? goal.monthly_amount : 0)
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [note, setNote] = useState(goal?.note ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      name, icon, color, note: note || null,
      target_amount: targetAmount,
      monthly_amount: monthlyAmount,
      deadline: deadline || null,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (goal) router.patch(`/finance/goals/${goal.id}`, data, opts)
    else router.post('/finance/goals', data, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Metas · {goal ? 'Editar' : 'Nova meta'}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>{goal ? goal.name : 'Criar meta'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          {/* Nome */}
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome</label>
            <input className="input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Casa própria" />
          </div>

          {/* Ícone */}
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Ícone</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {GOAL_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  style={{ height: 36, borderRadius: 8, border: `1px solid ${icon === ic ? 'color-mix(in oklab, var(--green) 50%, transparent)' : 'var(--line)'}`, background: icon === ic ? 'color-mix(in oklab, var(--green) 12%, transparent)' : 'var(--surface-2)', fontSize: 16, cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {GOAL_COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: color === c.value ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* Valor alvo + aporte mensal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor alvo (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={targetAmount} onValueChange={setTargetAmount} required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Aporte mensal (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={monthlyAmount} onValueChange={setMonthlyAmount} />
            </div>
          </div>

          {/* Prazo + nota */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prazo (mês/ano)</label>
              <input className="input" style={{ width: '100%' }} type="month" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nota</label>
              <input className="input" style={{ width: '100%' }} value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> {goal ? 'Salvar' : 'Criar meta'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Conta Corrente' },
  { value: 'savings',    label: 'Poupança' },
  { value: 'investment', label: 'Investimentos' },
  { value: 'cash',       label: 'Dinheiro' },
]

function AccountModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState('BRL')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post('/finance/accounts', {
      name,
      type,
      balance_encrypted: balance,
      currency,
    }, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Finanças · Contas</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Nova conta</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome da conta</label>
            <input className="input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Ex: Nubank, Bradesco, XP" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ACCOUNT_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${type === t.value ? 'color-mix(in oklab, var(--green) 50%, transparent)' : 'var(--line)'}`, background: type === t.value ? 'color-mix(in oklab, var(--green) 10%, transparent)' : 'var(--surface-2)', color: type === t.value ? 'var(--text)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, marginBottom: 20 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Saldo inicial (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={balance} onValueChange={setBalance} required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Moeda</label>
              <input className="input" style={{ width: '100%' }} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3} required />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Criar conta</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TransactionModal({ accounts, onClose }: { accounts: AccountItem[]; onClose: () => void }) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 0)
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [occurred_at, setOccurredAt] = useState(new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post(`/finance/accounts/${accountId}/transactions`, {
      type,
      amount_encrypted: amount,
      description,
      category: category || null,
      occurred_at,
    }, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Finanças · Novo lançamento</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Registrar transação</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          {/* Tipo */}
          <div className="seg" style={{ marginBottom: 14 }}>
            <button type="button" data-active={type === 'expense'} onClick={() => setType('expense')}>Despesa</button>
            <button type="button" data-active={type === 'income'} onClick={() => setType('income')}>Receita</button>
          </div>

          {/* Conta + Valor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Conta</label>
              <select className="input" style={{ width: '100%' }} value={accountId} onChange={e => setAccountId(Number(e.target.value))} required>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={amount} onValueChange={setAmount} autoFocus required />
            </div>
          </div>

          {/* Categoria + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
              <select className="input" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Sem categoria</option>
                {['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Vestuário','Assinaturas','Salário','Freelance','Investimento','Outros'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
              <input className="input" style={{ width: '100%' }} type="date" value={occurred_at} onChange={e => setOccurredAt(e.target.value)} required />
            </div>
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input className="input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ex: iFood — jantar" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Registrar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface BudgetDraft { id?: number; name: string; budget: number; color: string }

const BUDGET_COLORS = ['var(--green)','var(--gold)','var(--sky)','var(--purple, oklch(72% 0.12 290))','var(--pink, oklch(74% 0.14 340))','var(--teal, oklch(76% 0.12 195))']

function BudgetModal({ budgets, onClose }: { budgets: BudgetEntry[]; onClose: () => void }) {
  const [drafts, setDrafts] = useState<BudgetDraft[]>(
    budgets.map(b => ({ id: b.id, name: b.name, budget: b.budget, color: b.color }))
  )
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState(0)
  const [newColor, setNewColor] = useState(BUDGET_COLORS[0])

  function updateDraft(i: number, field: keyof BudgetDraft, value: string | number) {
    setDrafts(d => d.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function removeDraft(i: number) {
    setDrafts(d => d.filter((_, idx) => idx !== i))
  }
  function addCategory() {
    if (!newName.trim() || !newBudget) return
    setDrafts(d => [...d, { name: newName.trim(), budget: newBudget, color: newColor }])
    setNewName(''); setNewBudget(0)
  }
  function save() {
    router.put('/finance/budget-categories/batch', { categories: drafts }, {
      preserveScroll: true, onSuccess: onClose,
    })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div className="kicker">Finanças · Orçamentos</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Ajustar orçamentos</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>

        <div style={{ padding: '16px 26px', overflowY: 'auto', flex: 1 }}>
          {/* Lista existente */}
          {drafts.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flex: 'none' }} />
              <input className="input" style={{ flex: 1 }} value={d.name} onChange={e => updateDraft(i, 'name', e.target.value)} />
              <CurrencyInput className="input" style={{ width: 130 }} value={d.budget} onValueChange={v => updateDraft(i, 'budget', v)} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)', padding: '5px 8px' }} onClick={() => removeDraft(i)}><Icons.X size={12} /></button>
            </div>
          ))}

          {/* Nova categoria */}
          <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, marginTop: 4 }}>
            <div className="kicker" style={{ marginBottom: 10 }}>Nova categoria</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              {BUDGET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1 }} placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} />
              <CurrencyInput className="input" style={{ width: 110 }} value={newBudget} onValueChange={v => setNewBudget(v)} placeholder="Limite R$" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addCategory}><Icons.Plus size={13} /></button>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 26px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save}><Icons.Check size={13} /> Salvar</button>
        </div>
      </div>
    </div>
  )
}

function UpcomingPaymentModal({ payment, goals, onClose }: {
  payment: UpcomingPayment | null
  goals: FinancialGoal[]
  onClose: () => void
}) {
  const [description, setDescription] = useState(payment?.description ?? '')
  const [amount, setAmount] = useState<number>(payment?.amount ?? 0)
  const [dueDate, setDueDate] = useState(payment?.due_date ?? new Date().toISOString().slice(0, 10))
  const [linkedGoalId, setLinkedGoalId] = useState<number | ''>(payment?.linked_goal_id ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      description,
      amount: amount,
      due_date: dueDate,
      tag: linkedGoalId ? 'meta' : null,
      linked_goal_id: linkedGoalId || null,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (payment) router.patch(`/finance/upcoming-payments/${payment.id}`, data, opts)
    else router.post('/finance/upcoming-payments', data, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Finanças · Pagamentos</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>{payment ? 'Editar pagamento' : 'Novo pagamento'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div style={{ marginBottom: 12 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input className="input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ex: Fatura Bradesco" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={amount} onValueChange={setAmount} required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data de vencimento</label>
              <input className="input" style={{ width: '100%' }} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Vincular à meta (opcional)</label>
            <select className="input" style={{ width: '100%' }} value={linkedGoalId} onChange={e => setLinkedGoalId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Sem vínculo</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> {payment ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinanceIndex({ net_worth, month_income, month_expense, savings_rate, savings_goal_pct, flow_chart, donut, budgets, transactions, goals, month_label, accounts_list, upcoming_payments }: Props) {
  const [goalFilter, setGoalFilter] = useState<'todas' | 'no-prazo' | 'atencao' | 'atrasado'>('todas')
  const [aporteGoal, setAporteGoal] = useState<FinancialGoal | null>(null)
  const [goalModal, setGoalModal] = useState<{ goal: FinancialGoal | null } | null>(null)
  const [showTxModal, setShowTxModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [upcomingModal, setUpcomingModal] = useState<{ payment: UpcomingPayment | null } | null>(null)

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

  function handleDeleteGoal(g: FinancialGoal) {
    if (!confirm(`Excluir a meta "${g.name}"?`)) return
    router.delete(`/finance/goals/${g.id}`, { preserveScroll: true })
  }

  return (
    <AppLayout title="Finanças" eyebrow="Patrimônio" subtitle="Saldo, fluxo, orçamento e metas."
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowTxModal(true)}>
          <Icons.Plus size={13} /> Lançamento
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* BigStat cards */}
        <div className="grid g-4">
          {[
            { label: 'Patrimônio Líquido', value: fmtBRL(net_worth), sub: 'acumulado', dir: 'up' },
            { label: `Receitas · ${month_label}`, value: fmtBRL(month_income), sub: 'este mês', dir: 'up' },
            { label: `Despesas · ${month_label}`, value: fmtBRL(month_expense), sub: 'este mês', dir: 'flat' },
            { label: 'Taxa de poupança', value: savings_rate.toLocaleString('pt-BR') + '%', sub: `meta ${savings_goal_pct}%`, dir: savings_rate >= savings_goal_pct ? 'up' : 'flat' },
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
            <div className="card-head">
              <div className="card-title">Alocação patrimônio</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAccountModal(true)}>
                <Icons.Plus size={12} /> Nova Conta
              </button>
            </div>
            {donut.length > 0
              ? <DonutChart segments={donut} center={{ label: 'Total', value: fmtBRL(net_worth, true) }} />
              : <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
            }
          </div>
        </div>

        {/* Orçamentos + Próximos Pagamentos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
          {/* Orçamentos */}
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
                        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{fmtBRL(c.spent)}</span> / {fmtBRL(c.budget)}
                      </div>
                    </div>
                    <div className="meter"><span style={{ width: Math.min(100, c.pct) + '%', background: c.color }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos Pagamentos */}
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
                    <button className="icon-btn" style={{ width: 24, height: 24, flex: 'none', color: 'var(--rose)' }} onClick={() => {
                      if (confirm(`Remover "${p.description}"?`)) router.delete(`/finance/upcoming-payments/${p.id}`, { preserveScroll: true })
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

      {goalModal !== null && (
        <GoalModal goal={goalModal.goal} onClose={() => setGoalModal(null)} />
      )}
      {aporteGoal && <AporteModal goal={aporteGoal} onClose={() => setAporteGoal(null)} onSave={handleAporte} />}
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} />}
      {showTxModal && <TransactionModal accounts={accounts_list} onClose={() => setShowTxModal(false)} />}
      {showBudgetModal && <BudgetModal budgets={budgets} onClose={() => setShowBudgetModal(false)} />}
      {upcomingModal !== null && (
        <UpcomingPaymentModal
          payment={upcomingModal.payment}
          goals={goals}
          onClose={() => setUpcomingModal(null)}
        />
      )}
    </AppLayout>
  )
}
