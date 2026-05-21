import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { AccountItem, FinanceTransaction } from '@/types/finance'
import { idempotentPost } from '@/lib/idempotentPost'
import { EXPENSE_FALLBACK_CATEGORIES, INCOME_CATEGORIES } from '@/lib/finance/constants'

type TxType = 'expense' | 'income' | 'transfer'

interface Props {
  accounts: AccountItem[]
  budgetCategories: string[]
  transaction?: FinanceTransaction | null
  onClose: () => void
}

export default function TransactionModal({ accounts, budgetCategories, transaction, onClose }: Props) {
  const errors = usePage().props.errors as Record<string, string> | undefined
  const isEdit = !!transaction
  const [type, setType] = useState<TxType>(transaction?.type ?? 'expense')
  const [accountId, setAccountId] = useState(transaction?.account_id ?? accounts[0]?.id ?? 0)
  const [destinationId, setDestinationId] = useState<number | ''>(accounts[1]?.id ?? '')
  const [amount, setAmount] = useState(transaction?.amount ?? 0)
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [category, setCategory] = useState(transaction && transaction.category !== 'Outros' ? transaction.category : '')
  const [occurred_at, setOccurredAt] = useState(transaction?.occurred_at ?? new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const opts = { preserveScroll: true, onSuccess: onClose }

    if (isEdit) {
      // Backend de update aceita type/amount/description/category/occurred_at (não muda conta nem transfer)
      router.patch(`/finance/transactions/${transaction!.id}`, {
        type,
        amount,
        description,
        category: category || null,
        occurred_at,
      }, opts)
      return
    }

    const payload: Record<string, unknown> = {
      type,
      amount,
      description,
      occurred_at,
    }
    if (type === 'transfer') {
      if (destinationId === '' || destinationId === accountId) return
      payload.transfer_to_account_id = destinationId
    } else {
      payload.category = category || null
    }
    idempotentPost(`/finance/accounts/${accountId}/transactions`, payload, opts)
  }

  const destinationOptions = accounts.filter(a => a.id !== accountId)
  const submitLabel = type === 'transfer' ? 'Transferir' : 'Registrar'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Finanças · {isEdit ? 'Editar lançamento' : 'Novo lançamento'}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>{isEdit ? transaction!.description : 'Registrar transação'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div className="seg" style={{ marginBottom: 14 }}>
            <button type="button" data-active={type === 'expense'} onClick={() => setType('expense')}>Despesa</button>
            <button type="button" data-active={type === 'income'}  onClick={() => setType('income')}>Receita</button>
            {!isEdit && (
              <button type="button" data-active={type === 'transfer'} onClick={() => setType('transfer')}>Transferência</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>
                {type === 'transfer' ? 'De' : 'Conta'}
              </label>
              <select className="input" style={{ width: '100%' }} value={accountId} onChange={e => setAccountId(Number(e.target.value))} required disabled={isEdit}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={amount} onValueChange={setAmount} autoFocus required />
            </div>
          </div>

          {type === 'transfer' ? (
            <div style={{ marginBottom: 12 }}>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Para</label>
              <select className="input" style={{ width: '100%' }} value={destinationId} onChange={e => setDestinationId(e.target.value === '' ? '' : Number(e.target.value))} required>
                <option value="">Selecionar conta de destino</option>
                {destinationOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors?.transfer_to_account_id && (
                <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.transfer_to_account_id}</div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
                <select className="input" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Sem categoria</option>
                  {(type === 'income'
                    ? INCOME_CATEGORIES
                    : (budgetCategories.length > 0 ? budgetCategories : EXPENSE_FALLBACK_CATEGORIES)
                  ).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
                <input className="input" style={{ width: '100%' }} type="date" value={occurred_at} onChange={e => setOccurredAt(e.target.value)} required />
              </div>
            </div>
          )}

          {type === 'transfer' && (
            <div style={{ marginBottom: 12 }}>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
              <input className="input" style={{ width: '100%' }} type="date" value={occurred_at} onChange={e => setOccurredAt(e.target.value)} required />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input
              className="input"
              style={{ width: '100%' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              placeholder={type === 'transfer' ? 'Ex: PIX para reserva' : 'Ex: iFood — jantar'}
            />
          </div>

          {errors?.amount_encrypted && (
            <div style={{ color: 'var(--rose)', fontSize: 12, marginBottom: 12 }}>{errors.amount_encrypted}</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> {isEdit ? 'Salvar' : submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
