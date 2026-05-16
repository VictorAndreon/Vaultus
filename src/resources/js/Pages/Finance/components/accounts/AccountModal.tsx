import { useState } from 'react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { ACCOUNT_TYPES } from '@/lib/finance/constants'
import { idempotentPost } from '@/lib/idempotentPost'

interface Props {
  onClose: () => void
}

export default function AccountModal({ onClose }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState('BRL')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    idempotentPost('/finance/accounts', {
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
