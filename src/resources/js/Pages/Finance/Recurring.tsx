import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { fmtBRL } from '@/lib/finance/formatters'
import RecurringRuleModal from './components/recurring/RecurringRuleModal'
import { AccountItem } from '@/types/finance'

export interface RecurringRule {
  id: number
  account_id: number
  account_name: string | null
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string | null
  day_of_month: number
  starts_on: string
  ends_on: string | null
  last_run_on: string | null
  is_active: boolean
}

interface Props {
  rules: RecurringRule[]
  accounts: AccountItem[]
}

export default function Recurring({ rules, accounts }: Props) {
  const [modal, setModal] = useState<{ rule: RecurringRule | null } | null>(null)
  const incomes  = rules.filter(r => r.type === 'income')
  const expenses = rules.filter(r => r.type === 'expense')
  const totalMonthlyIncome  = incomes.filter(r => r.is_active).reduce((s, r) => s + r.amount, 0)
  const totalMonthlyExpense = expenses.filter(r => r.is_active).reduce((s, r) => s + r.amount, 0)

  function togglePause(rule: RecurringRule) {
    router.patch(`/finance/recurring/${rule.id}`, { is_active: !rule.is_active }, { preserveScroll: true })
  }

  function destroy(rule: RecurringRule) {
    if (!confirm(`Excluir a regra "${rule.description}"?`)) return
    router.delete(`/finance/recurring/${rule.id}`, { preserveScroll: true })
  }

  return (
    <AppLayout
      title="Recorrências"
      eyebrow="Finanças"
      subtitle="Lançamentos automáticos materializados diariamente"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ rule: null })}>
          <Icons.Plus size={13} /> Nova regra
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div className="grid g-2">
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Receitas recorrentes (ativas)</div>
            <div className="stat-value" style={{ fontSize: 28, color: 'var(--success)' }}>{fmtBRL(totalMonthlyIncome)}</div>
            <div className="stat-delta up" style={{ marginTop: 4 }}>{incomes.filter(r => r.is_active).length} regras / mês</div>
          </div>
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Despesas recorrentes (ativas)</div>
            <div className="stat-value" style={{ fontSize: 28, color: 'var(--rose)' }}>{fmtBRL(totalMonthlyExpense)}</div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>{expenses.filter(r => r.is_active).length} regras / mês</div>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="card-title">Regras configuradas</div>
            <div className="mono muted" style={{ fontSize: 11 }}>{rules.length} no total · varre todo dia 06h</div>
          </div>

          {rules.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
              Nenhuma regra ainda. Use o botão acima para automatizar salário, aluguel ou assinaturas.
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 130px 90px 110px 90px 100px', padding: '10px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
                <div></div>
                <div>Descrição</div>
                <div>Conta</div>
                <div style={{ textAlign: 'center' }}>Dia</div>
                <div style={{ textAlign: 'right' }}>Valor</div>
                <div style={{ textAlign: 'center' }}>Status</div>
                <div></div>
              </div>
              {rules.map((r, i) => {
                const dotColor = r.type === 'income' ? 'var(--success)' : 'var(--rose)'
                const inactive = !r.is_active
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 130px 90px 110px 90px 100px', alignItems: 'center', padding: '14px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', fontSize: 13, opacity: inactive ? 0.55 : 1 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }} />
                    <div>
                      <div style={{ color: 'var(--text)', fontWeight: 500 }}>{r.description}</div>
                      {r.category && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{r.category}</div>}
                    </div>
                    <div className="muted mono" style={{ fontSize: 12 }}>{r.account_name ?? '—'}</div>
                    <div className="mono" style={{ textAlign: 'center', fontSize: 12 }}>{r.day_of_month}</div>
                    <div className="mono" style={{ textAlign: 'right', color: r.type === 'income' ? 'var(--success)' : 'var(--rose)', fontWeight: 500 }}>
                      {r.type === 'income' ? '+' : '−'} {fmtBRL(r.amount)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span className={`tag ${r.is_active ? 'tag-green' : ''}`} style={{ fontSize: 10 }}>
                        <span className="dot" />{r.is_active ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title={r.is_active ? 'Pausar' : 'Ativar'} style={{ width: 26, height: 26 }} onClick={() => togglePause(r)}>
                        {r.is_active ? <Icons.X size={11} /> : <Icons.Check size={11} />}
                      </button>
                      <button className="icon-btn" title="Editar" style={{ width: 26, height: 26 }} onClick={() => setModal({ rule: r })}>
                        <Icons.Edit size={11} />
                      </button>
                      <button className="icon-btn" title="Excluir" style={{ width: 26, height: 26, color: 'var(--rose)' }} onClick={() => destroy(r)}>
                        <Icons.Trash size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <RecurringRuleModal
          rule={modal.rule}
          accounts={accounts}
          onClose={() => setModal(null)}
        />
      )}
    </AppLayout>
  )
}
