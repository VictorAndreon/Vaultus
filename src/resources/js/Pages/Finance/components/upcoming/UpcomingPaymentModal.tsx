import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { FinancialGoal, UpcomingPayment } from '@/types/finance'
import { idempotentPost } from '@/lib/idempotentPost'

interface Props {
  payment: UpcomingPayment | null
  goals: FinancialGoal[]
  onClose: () => void
}

export default function UpcomingPaymentModal({ payment, goals, onClose }: Props) {
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
    else idempotentPost('/finance/upcoming-payments', data, opts)
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
              {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
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
