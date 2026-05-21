import { Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { fmtBRL } from '@/lib/finance/formatters'

interface StatementSummary {
  period_start: string
  period_end: string
  closes_at: string
  due_at: string
  total: number
  paid: number
  status: 'aberta' | 'fechada' | 'paga' | 'atrasada'
}

interface Card {
  id: number
  name: string
  used: number
  credit_limit: number | null
  closing_day: number | null
  due_day: number | null
  current_statement: StatementSummary | null
}

interface Props {
  cards: Card[]
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  aberta:    { label: 'Aberta',    cls: 'tag-sky' },
  fechada:   { label: 'Fechada',   cls: 'tag-gold' },
  atrasada:  { label: 'Atrasada',  cls: 'tag-rose' },
  paga:      { label: 'Paga',      cls: 'tag-green' },
}

export default function CardsPage({ cards }: Props) {
  return (
    <AppLayout
      title="Cartões"
      eyebrow="Finanças"
      subtitle="Limite, fatura aberta e atalho para o detalhe"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {cards.length === 0 ? (
          <div className="card" style={{ padding: 24, color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
            Nenhum cartão de crédito cadastrado. Vá em "Nova Conta" no dashboard e escolha o tipo "Cartão de Crédito".
          </div>
        ) : (
          <div className="grid g-2">
            {cards.map(card => {
              const limitPct = card.credit_limit
                ? Math.min(100, Math.round((card.used / card.credit_limit) * 100))
                : 0
              const stmt = card.current_statement
              const status = stmt ? STATUS_MAP[stmt.status] : null
              const remaining = stmt ? Math.max(0, stmt.total - stmt.paid) : 0
              const available = card.credit_limit ? Math.max(0, card.credit_limit - card.used) : null

              return (
                <div key={card.id} className="card" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>{card.name}</span>
                        {status && <span className={`tag ${status.cls}`} style={{ fontSize: 10 }}><span className="dot" />{status.label}</span>}
                      </div>
                      {card.closing_day && card.due_day && (
                        <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>
                          fecha dia {card.closing_day} · vence dia {card.due_day}
                        </div>
                      )}
                    </div>
                    <Link href={`/finance/accounts/${card.id}/statement`} className="btn btn-ghost btn-sm">
                      Ver fatura →
                    </Link>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="kicker">Limite usado</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {card.credit_limit ? `${limitPct}%` : 'sem limite cadastrado'}
                      </span>
                    </div>
                    <div className="meter" style={{ height: 6 }}>
                      <span style={{ width: limitPct + '%', background: limitPct >= 80 ? 'var(--rose)' : 'var(--gold)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--rose)', fontFamily: 'var(--mono)' }}>{fmtBRL(card.used)}</span>
                      {card.credit_limit && (
                        <span className="muted mono">
                          disponível {fmtBRL(available ?? 0)} / {fmtBRL(card.credit_limit)}
                        </span>
                      )}
                    </div>
                  </div>

                  {stmt ? (
                    <div style={{ paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <div className="kicker">Total da fatura</div>
                          <div className="mono" style={{ fontSize: 14, color: 'var(--text)', marginTop: 4 }}>{fmtBRL(stmt.total)}</div>
                        </div>
                        <div>
                          <div className="kicker">A pagar</div>
                          <div className="mono" style={{ fontSize: 14, color: remaining > 0 ? 'var(--rose)' : 'var(--success)', marginTop: 4 }}>
                            {fmtBRL(remaining)}
                          </div>
                        </div>
                        <div>
                          <div className="kicker">Vence em</div>
                          <div className="mono" style={{ fontSize: 14, color: 'var(--text)', marginTop: 4 }}>{stmt.due_at}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingTop: 14, borderTop: '1px solid var(--line-soft)', fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icons.Calendar size={11} /> Cadastre dia de fechamento e vencimento para ver fatura.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
