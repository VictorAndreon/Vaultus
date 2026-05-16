import { useState } from 'react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { AccountItem } from '@/types/finance'
import { idempotentPost } from '@/lib/idempotentPost'

interface Props {
  accounts: AccountItem[]
  budgetCategories: string[]
  onClose: () => void
}

export default function TransactionModal({ accounts, budgetCategories, onClose }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 0)
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [occurred_at, setOccurredAt] = useState(new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    idempotentPost(`/finance/accounts/${accountId}/transactions`, {
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
          <div className="seg" style={{ marginBottom: 14 }}>
            <button type="button" data-active={type === 'expense'} onClick={() => setType('expense')}>Despesa</button>
            <button type="button" data-active={type === 'income'} onClick={() => setType('income')}>Receita</button>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
              <select className="input" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Sem categoria</option>
                {(type === 'income'
                  ? ['Salário', 'Freelance', 'Investimento', 'Outros']
                  : (budgetCategories.length > 0 ? budgetCategories : ['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Vestuário','Assinaturas','Outros'])
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
