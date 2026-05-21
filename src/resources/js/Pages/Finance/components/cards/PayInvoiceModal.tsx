import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { idempotentPost } from '@/lib/idempotentPost'
import { AccountItem } from '@/types/finance'

interface Props {
  card: { id: number; name: string }
  remaining: number
  dueAt: string
  paymentAccounts: AccountItem[]
  onClose: () => void
}

/**
 * Pagar fatura = transferência de uma conta corrente/poupança para o cartão.
 * Reusa o endpoint /finance/accounts/{source}/transactions com type=transfer.
 * Não precisa de modelo novo — pagamento é reconhecido na Statement como
 * "soma de transfers recebidos no período" (ver CreditCardStatement).
 */
export default function PayInvoiceModal({ card, remaining, dueAt, paymentAccounts, onClose }: Props) {
  const errors = usePage().props.errors as Record<string, string> | undefined
  const [sourceId, setSourceId] = useState<number>(paymentAccounts[0]?.id ?? 0)
  const [amount, setAmount] = useState<number>(remaining)
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceId || amount <= 0) return
    idempotentPost(`/finance/accounts/${sourceId}/transactions`, {
      type: 'transfer',
      amount,
      description: `Pagamento fatura · ${card.name}`,
      occurred_at: occurredAt,
      transfer_to_account_id: card.id,
    }, { preserveScroll: true, onSuccess: onClose })
  }

  if (paymentAccounts.length === 0) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 400, padding: 24 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>Pagamento</div>
          <div style={{ color: 'var(--text)', fontSize: 15, marginBottom: 16 }}>
            Você precisa de uma conta corrente ou poupança cadastrada para pagar a fatura.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Fatura · {card.name}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Pagar fatura</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Vencimento: {dueAt}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>De qual conta?</label>
            <select className="input" style={{ width: '100%' }} value={sourceId} onChange={e => setSourceId(Number(e.target.value))} required>
              {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={amount} onValueChange={setAmount} required autoFocus />
              {errors?.amount && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.amount}</div>}
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
              <input type="date" className="input" style={{ width: '100%' }} value={occurredAt} onChange={e => setOccurredAt(e.target.value)} required />
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, lineHeight: 1.5 }}>
            Cria uma <b>transferência</b> da conta escolhida para o cartão. Ela reduz o saldo devedor e marca a fatura como paga quando cobrir o total.
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Confirmar pagamento</button>
          </div>
        </form>
      </div>
    </div>
  )
}
