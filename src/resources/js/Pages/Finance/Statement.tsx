import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { fmtBRL } from '@/lib/finance/formatters'

interface StatementTransaction {
  id: number
  occurred_at: string
  description: string
  category: string | null
  amount: number
}

interface Statement {
  account_id: number
  account_name: string
  period_start: string
  period_end: string
  closes_at: string
  due_at: string
  total: number
  paid: number
  status: 'aberta' | 'fechada' | 'paga' | 'atrasada'
}

interface Props {
  account: { id: number; name: string; closing_day: number; due_day: number }
  statement: Statement & { transactions: StatementTransaction[] }
  month: string
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  aberta:    { label: 'Aberta',    cls: 'tag-sky' },
  fechada:   { label: 'Fechada',   cls: 'tag-gold' },
  atrasada:  { label: 'Atrasada',  cls: 'tag-rose' },
  paga:      { label: 'Paga',      cls: 'tag-green' },
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function StatementPage({ account, statement, month }: Props) {
  const remaining = Math.max(0, statement.total - statement.paid)
  const status = STATUS_MAP[statement.status] ?? STATUS_MAP.aberta

  function goToMonth(m: string) {
    router.get(`/finance/accounts/${account.id}/statement`, { month: m }, { preserveScroll: true, preserveState: true, replace: true })
  }

  return (
    <AppLayout
      title={`Fatura · ${account.name}`}
      eyebrow="Cartão de crédito"
      subtitle={`Vencimento em ${statement.due_at} · período ${statement.period_start} → ${statement.period_end}`}
      actions={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="icon-btn" title="Mês anterior" style={{ width: 30, height: 30 }} onClick={() => goToMonth(prevMonth(month))}>
            <Icons.ChevronLeft size={13} />
          </button>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 72, textAlign: 'center' }}>{month}</span>
          <button className="icon-btn" title="Próximo mês" style={{ width: 30, height: 30 }} onClick={() => goToMonth(nextMonth(month))}>
            <Icons.ChevronRight size={13} />
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div className="grid g-3">
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Total da fatura</div>
            <div className="stat-value" style={{ fontSize: 32 }}>{fmtBRL(statement.total)}</div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>
              {statement.transactions.length} compras
            </div>
          </div>
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Pago</div>
            <div className="stat-value" style={{ fontSize: 32, color: 'var(--success)' }}>{fmtBRL(statement.paid)}</div>
            <div className="stat-delta up" style={{ marginTop: 4 }}>transferências p/ o cartão</div>
          </div>
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">A pagar</div>
            <div className="stat-value" style={{ fontSize: 32, color: remaining > 0 ? 'var(--rose)' : 'var(--success)' }}>{fmtBRL(remaining)}</div>
            <div style={{ marginTop: 6 }}>
              <span className={`tag ${status.cls}`} style={{ fontSize: 10 }}>
                <span className="dot" />{status.label}
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="kicker">Fechamento</div>
              <div className="mono" style={{ fontSize: 14, color: 'var(--text)', marginTop: 2 }}>{statement.closes_at}</div>
            </div>
            <div>
              <div className="kicker">Vencimento</div>
              <div className="mono" style={{ fontSize: 14, color: 'var(--text)', marginTop: 2 }}>{statement.due_at}</div>
            </div>
          </div>
          {remaining > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Para pagar, faça uma <b>transferência de uma conta corrente para este cartão</b> no Dashboard.
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
            <div className="card-title">Compras da fatura</div>
          </div>
          {statement.transactions.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
              Nenhuma compra nesse ciclo.
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 160px 130px', padding: '10px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
                <div>Data</div>
                <div>Descrição</div>
                <div>Categoria</div>
                <div style={{ textAlign: 'right' }}>Valor</div>
              </div>
              {statement.transactions.map((t, i) => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 160px 130px', alignItems: 'center', padding: '12px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', fontSize: 13 }}>
                  <div className="mono muted" style={{ fontSize: 11 }}>{t.occurred_at}</div>
                  <div>{t.description}</div>
                  <div className="muted">{t.category ?? '—'}</div>
                  <div className="mono" style={{ textAlign: 'right', color: 'var(--rose)', fontWeight: 500 }}>− {fmtBRL(t.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
