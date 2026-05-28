import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { FinancialGoal } from '@/types/finance'
import { DEADLINE_MONTHS, GOAL_COLORS, GOAL_ICON_KEYS } from '@/lib/finance/constants'
import { idempotentPost } from '@/lib/idempotentPost'
import { GOAL_ICON_MAP } from '@/Components/GoalIcon'

interface Props {
  goal: FinancialGoal | null
  onClose: () => void
}

export default function GoalModal({ goal, onClose }: Props) {
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? 'shield')
  const [color, setColor] = useState(goal?.color ?? 'var(--green)')
  const [targetAmount, setTargetAmount] = useState(goal ? goal.target_amount : 0)
  const [monthlyAmount, setMonthlyAmount] = useState(goal ? goal.monthly_amount : 0)
  const [deadlineMonth, setDeadlineMonth] = useState(goal?.deadline ? goal.deadline.slice(5, 7) : '')
  const [deadlineYear, setDeadlineYear] = useState(goal?.deadline ? goal.deadline.slice(0, 4) : '')
  const [note, setNote] = useState(goal?.note ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetAmount) return
    const deadline = deadlineMonth && deadlineYear ? `${deadlineYear}-${deadlineMonth}` : null
    const data = {
      name, icon, color, note: note || null,
      target_amount: targetAmount,
      monthly_amount: monthlyAmount,
      deadline,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (goal) router.patch(`/finance/goals/${goal.id}`, data, opts)
    else idempotentPost('/finance/goals', data, opts)
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
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome</label>
            <input className="input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Casa própria" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Ícone</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {GOAL_ICON_KEYS.map(key => {
                const Ic = GOAL_ICON_MAP[key]
                const active = icon === key
                return (
                  <button key={key} type="button" onClick={() => setIcon(key)} style={{
                    height: 38, borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${active ? 'color-mix(in oklab, var(--green) 50%, transparent)' : 'var(--line)'}`,
                    background: active ? 'color-mix(in oklab, var(--green) 12%, var(--surface-2))' : 'var(--surface-2)',
                    color: active ? 'var(--green)' : 'var(--text-3)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Ic size={16} strokeWidth={1.5} />
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {GOAL_COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: color === c.value ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor alvo (R$) *</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={targetAmount} onValueChange={setTargetAmount} />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Aporte mensal (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={monthlyAmount} onValueChange={setMonthlyAmount} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prazo (opcional)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <select className="input" value={deadlineMonth} onChange={e => setDeadlineMonth(e.target.value)}>
                  <option value="">Mês</option>
                  {DEADLINE_MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <input className="input" type="number" placeholder="Ano" min={new Date().getFullYear()} max={new Date().getFullYear() + 30}
                  value={deadlineYear} onChange={e => setDeadlineYear(e.target.value)} />
              </div>
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
