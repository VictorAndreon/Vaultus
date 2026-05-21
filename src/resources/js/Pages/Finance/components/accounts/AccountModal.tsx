import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { ACCOUNT_TYPES, LIABILITY_TYPES } from '@/lib/finance/constants'
import { idempotentPost } from '@/lib/idempotentPost'

interface Props {
  onClose: () => void
}

export default function AccountModal({ onClose }: Props) {
  const errors = usePage().props.errors as Record<string, string> | undefined
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState('BRL')
  const [creditLimit, setCreditLimit] = useState(0)
  const [interestRate, setInterestRate] = useState<number | ''>('')
  const [closingDay, setClosingDay] = useState<number | ''>('')
  const [dueDay, setDueDay] = useState<number | ''>('')

  const isLiability = LIABILITY_TYPES.includes(type)
  const balanceLabel = isLiability ? 'Dívida atual (saldo devedor)' : 'Saldo inicial (R$)'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      name,
      type,
      balance_encrypted: balance,
      currency,
    }
    if (type === 'credit') {
      payload.credit_limit_encrypted = creditLimit
      if (closingDay !== '') payload.closing_day = closingDay
      if (dueDay !== '')     payload.due_day = dueDay
    }
    if (isLiability && interestRate !== '') {
      payload.interest_rate = interestRate
    }
    idempotentPost('/finance/accounts', payload, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
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
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: `1px solid ${type === t.value ? 'color-mix(in oklab, var(--green) 50%, transparent)' : 'var(--line)'}`,
                    background: type === t.value ? 'color-mix(in oklab, var(--green) 10%, transparent)' : 'var(--surface-2)',
                    color: type === t.value ? 'var(--text)' : 'var(--text-3)',
                    fontSize: 13, cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {t.label}
                  {t.isLiability && (
                    <span className="tag tag-rose" style={{ fontSize: 9 }}>passivo</span>
                  )}
                </button>
              ))}
            </div>
            {isLiability && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
                Este tipo é um passivo — será subtraído do seu patrimônio líquido.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>{balanceLabel}</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={balance} onValueChange={setBalance} required />
              {errors?.balance_encrypted && (
                <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.balance_encrypted}</div>
              )}
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Moeda</label>
              <input className="input" style={{ width: '100%' }} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3} required />
            </div>
          </div>

          {type === 'credit' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Limite do cartão (R$)</label>
                <CurrencyInput className="input" style={{ width: '100%' }} value={creditLimit} onValueChange={setCreditLimit} />
                {errors?.credit_limit_encrypted && (
                  <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.credit_limit_encrypted}</div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Dia de fechamento</label>
                  <input type="number" min={1} max={31} className="input" style={{ width: '100%' }}
                    value={closingDay} onChange={e => setClosingDay(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 5" />
                  {errors?.closing_day && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.closing_day}</div>}
                </div>
                <div>
                  <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Dia de vencimento</label>
                  <input type="number" min={1} max={31} className="input" style={{ width: '100%' }}
                    value={dueDay} onChange={e => setDueDay(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 15" />
                  {errors?.due_day && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.due_day}</div>}
                </div>
              </div>
            </>
          )}

          {isLiability && (
            <div style={{ marginBottom: 20 }}>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Taxa de juros anual (% — opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="999"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="input"
                style={{ width: '100%' }}
                placeholder="Ex: 12.5"
              />
              {errors?.interest_rate && (
                <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.interest_rate}</div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: isLiability ? 0 : 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Criar conta</button>
          </div>
        </form>
      </div>
    </div>
  )
}
