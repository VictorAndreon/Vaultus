import { useState } from 'react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { FinancialGoal, AccountItem } from '@/types/finance'

interface Props {
  goal: FinancialGoal
  accounts: AccountItem[]
  onClose: () => void
  onSave: (v: { amount: number; accountId: number }) => void
}

export default function AporteModal({ goal, accounts, onClose, onSave }: Props) {
  const externalAccounts = accounts.filter(a => a.type !== 'goal')
  const [amount, setAmount] = useState(goal.monthly_amount > 0 ? goal.monthly_amount : 0)
  const [accountId, setAccountId] = useState<number | ''>(externalAccounts[0]?.id ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (amount > 0 && accountId !== '') onSave({ amount, accountId: Number(accountId) })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div className="kicker">Aportar · {goal.name}</div><div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Registrar aporte</div></div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '22px 26px' }}>
          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>De qual conta?</label>
          <select
            className="input"
            style={{ width: '100%', marginBottom: 16 }}
            value={accountId}
            onChange={e => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}
            required
          >
            <option value="">Selecionar conta de origem</option>
            {externalAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Valor do aporte (R$)</label>
          <CurrencyInput value={amount} onValueChange={setAmount} autoFocus style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--mono)' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={accountId === '' || amount <= 0}>
              <Icons.Check size={13} /> Confirmar aporte
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
