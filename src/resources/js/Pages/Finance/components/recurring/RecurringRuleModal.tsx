import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { idempotentPost } from '@/lib/idempotentPost'
import { AccountItem } from '@/types/finance'
import type { RecurringRule } from '../../Recurring'

interface Props {
  rule: RecurringRule | null
  accounts: AccountItem[]
  onClose: () => void
}

type TxType = 'expense' | 'income'

export default function RecurringRuleModal({ rule, accounts, onClose }: Props) {
  const errors = usePage().props.errors as Record<string, string> | undefined
  const isEdit = !!rule
  const [type, setType] = useState<TxType>(rule?.type ?? 'expense')
  const [accountId, setAccountId] = useState<number>(rule?.account_id ?? accounts[0]?.id ?? 0)
  const [amount, setAmount] = useState<number>(rule?.amount ?? 0)
  const [description, setDescription] = useState(rule?.description ?? '')
  const [category, setCategory] = useState(rule?.category ?? '')
  const [dayOfMonth, setDayOfMonth] = useState(rule?.day_of_month ?? 1)
  const [startsOn, setStartsOn] = useState(rule?.starts_on ?? new Date().toISOString().slice(0, 10))
  const [endsOn, setEndsOn] = useState(rule?.ends_on ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      account_id:       accountId,
      type,
      amount_encrypted: amount,
      description,
      category:         category || null,
      day_of_month:     dayOfMonth,
      starts_on:        startsOn,
      ends_on:          endsOn || null,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (isEdit) router.patch(`/finance/recurring/${rule!.id}`, payload, opts)
    else        idempotentPost('/finance/recurring', payload, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="kicker">Recorrência · {isEdit ? 'Editar' : 'Nova regra'}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>{isEdit ? rule!.description : 'Configurar regra'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>

        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div className="seg" style={{ marginBottom: 14 }}>
            <button type="button" data-active={type === 'expense'} onClick={() => setType('expense')}>Despesa</button>
            <button type="button" data-active={type === 'income'}  onClick={() => setType('income')}>Receita</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Conta</label>
              <select className="input" style={{ width: '100%' }} value={accountId} onChange={e => setAccountId(Number(e.target.value))} required>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors?.account_id && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.account_id}</div>}
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={amount} onValueChange={setAmount} required autoFocus />
              {errors?.amount_encrypted && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.amount_encrypted}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input className="input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ex: Salário, Aluguel, Netflix" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
              <input className="input" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Dia do mês</label>
              <input type="number" min={1} max={31} className="input" style={{ width: '100%' }} value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Início</label>
              <input type="date" className="input" style={{ width: '100%' }} value={startsOn} onChange={e => setStartsOn(e.target.value)} required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Fim (opcional)</label>
              <input type="date" className="input" style={{ width: '100%' }} value={endsOn} onChange={e => setEndsOn(e.target.value)} />
              {errors?.ends_on && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.ends_on}</div>}
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, lineHeight: 1.5 }}>
            A regra cria <b>uma transação por mês</b> no dia escolhido. Se o mês não tiver esse dia (ex: 31 em fevereiro), usa o último disponível. Materialização ocorre uma vez por dia às 06h.
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
