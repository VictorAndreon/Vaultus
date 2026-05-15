import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { Account, Transaction, PaginatedResponse } from '@/types'
import TransactionList from './components/TransactionList'

interface Props {
  account: { data: Account }
  transactions: PaginatedResponse<Transaction>
  month_income: number
  month_expense: number
  month_count: number
  peak_balance: number
}

const TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança',
  investment: 'Investimento', cash: 'Dinheiro',
}

const TYPE_COLORS: Record<string, string> = {
  checking: 'var(--sky)', savings: 'var(--green)',
  investment: 'var(--purple, oklch(72% 0.12 290))', cash: 'var(--text-4)',
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function TransactionModal({ accountId, transaction, onClose }: {
  accountId: number
  transaction: Transaction | null
  onClose: () => void
}) {
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState<number>(transaction?.amount ?? 0)
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [occurred_at, setOccurredAt] = useState(transaction?.occurred_at ?? new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const data = { type, amount_encrypted: amount, description, category: category || null, occurred_at }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (transaction === null) router.post(`/finance/accounts/${accountId}/transactions`, data, opts)
    else router.patch(`/finance/transactions/${transaction.id}`, data, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="kicker">{transaction ? 'Editar lançamento' : 'Novo lançamento'}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>
              {transaction ? transaction.description : 'Registrar transação'}
            </div>
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
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Valor (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={amount} onValueChange={setAmount} autoFocus required />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Data</label>
              <input className="input" style={{ width: '100%' }} type="date" value={occurred_at} onChange={e => setOccurredAt(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Descrição</label>
            <input className="input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
            <select className="input" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Sem categoria</option>
              {['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Vestuário','Assinaturas','Salário','Freelance','Investimento','Outros'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> {transaction ? 'Salvar' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinanceAccount({ account, transactions, month_income, month_expense, month_count, peak_balance }: Props) {
  const [txModal, setTxModal] = useState<{ tx: Transaction | null } | null>(null)
  const acc = account.data
  const color = TYPE_COLORS[acc.type] ?? 'var(--text-4)'
  const balance = acc.current_balance
  const peakPct = peak_balance > 0 ? Math.round((balance / peak_balance) * 100) : 100

  return (
    <AppLayout
      title={acc.name}
      eyebrow={TYPE_LABELS[acc.type] ?? acc.type}
      subtitle="Histórico e lançamentos desta conta"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setTxModal({ tx: null })}>
          <Icons.Plus size={13} /> Nova Transação
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
          {/* Saldo */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Saldo atual</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span className="tag" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
                <span className="dot" style={{ background: color }} />{TYPE_LABELS[acc.type] ?? acc.type}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>{acc.currency}</span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 34, color: 'var(--text)', letterSpacing: '-.015em', marginTop: 10 }}>{fmtBRL(balance)}</div>
            <div className="meter" style={{ marginTop: 10 }}><span style={{ width: peakPct + '%' }} /></div>
            <div className="stat-delta flat" style={{ marginTop: 5 }}>{peakPct}% do pico histórico</div>
          </div>

          {/* Receitas */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Receitas · mês</div>
            <div className="stat-value" style={{ fontSize: 22, color: 'var(--green)', marginTop: 6 }}>{fmtBRL(month_income)}</div>
            <div className="stat-delta up" style={{ marginTop: 4 }}><Icons.ArrowUpRight size={11} />este mês</div>
          </div>

          {/* Despesas */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Despesas · mês</div>
            <div className="stat-value" style={{ fontSize: 22, color: 'var(--rose)', marginTop: 6 }}>{fmtBRL(month_expense)}</div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>este mês</div>
          </div>

          {/* Contagem */}
          <div className="stat" style={{ padding: '20px 24px' }}>
            <div className="stat-label">Transações</div>
            <div className="stat-value" style={{ fontSize: 22, marginTop: 6 }}>{month_count}</div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>este mês</div>
          </div>
        </div>

        {/* Tabela de transações */}
        <TransactionList
          transactions={transactions}
          accountId={acc.id}
          onEdit={t => setTxModal({ tx: t })}
        />

      </div>

      {txModal !== null && (
        <TransactionModal
          accountId={acc.id}
          transaction={txModal.tx}
          onClose={() => setTxModal(null)}
        />
      )}
    </AppLayout>
  )
}
