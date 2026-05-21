import { useState } from 'react'
import { Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Account, Transaction, PaginatedResponse } from '@/types'
import { AccountItem, FinanceTransaction } from '@/types/finance'
import { fmtBRL } from '@/lib/finance/formatters'
import TransactionList from './components/TransactionList'
import TransactionModal from './components/transactions/TransactionModal'

interface Props {
  account: { data: Account }
  transactions: PaginatedResponse<Transaction>
  month_income: number
  month_expense: number
  month_count: number
  peak_balance: number
  accounts_list: AccountItem[]
  budget_category_names: string[]
}

const TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança',
  investment: 'Investimento', cash: 'Dinheiro',
  credit: 'Cartão de Crédito', loan: 'Financiamento',
}

const TYPE_COLORS: Record<string, string> = {
  checking: 'var(--sky)', savings: 'var(--green)',
  investment: 'var(--purple, oklch(72% 0.12 290))', cash: 'var(--text-4)',
  credit: 'var(--rose)', loan: 'var(--gold)',
}

// Converte a Transaction da API genérica para o shape que TransactionModal espera
// para o modo edição. Campos extras (date, method) não são lidos pelo modal — passamos vazios.
function toFinanceTransaction(t: Transaction, accountId: number): FinanceTransaction {
  return {
    id:          t.id,
    account_id:  accountId,
    date:        t.occurred_at,
    occurred_at: t.occurred_at,
    description: t.description,
    category:    t.category ?? '',
    method:      '',
    amount:      t.amount,
    type:        t.type as 'income' | 'expense' | 'transfer',
  }
}

export default function FinanceAccount({
  account, transactions, month_income, month_expense, month_count, peak_balance,
  accounts_list, budget_category_names,
}: Props) {
  const [txModal, setTxModal] = useState<{ tx: FinanceTransaction | null } | null>(null)
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
        <div style={{ display: 'flex', gap: 8 }}>
          {acc.type === 'credit' && (
            <Link href={`/finance/accounts/${acc.id}/statement`} className="btn btn-ghost btn-sm">
              <Icons.Calendar size={13} /> Ver fatura
            </Link>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setTxModal({ tx: null })}>
            <Icons.Plus size={13} /> Nova Transação
          </button>
        </div>
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
          onEdit={t => setTxModal({ tx: toFinanceTransaction(t, acc.id) })}
        />

      </div>

      {txModal !== null && (
        <TransactionModal
          accounts={accounts_list}
          budgetCategories={budget_category_names}
          transaction={txModal.tx}
          onClose={() => setTxModal(null)}
        />
      )}
    </AppLayout>
  )
}
