import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'

interface AccountRef { id: number; name: string; type: string }

export interface ListedTransaction {
  id: number
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  category: string | null
  occurred_at: string
  account: AccountRef | null
  is_transfer: boolean
}

interface PaginatedTransactions {
  data: ListedTransaction[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  next_page_url: string | null
  prev_page_url: string | null
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function TransactionsTable({ transactions }: { transactions: PaginatedTransactions }) {
  function go(url: string | null) {
    if (!url) return
    router.get(url, {}, { preserveScroll: true, preserveState: true })
  }

  function handleDelete(id: number) {
    if (!confirm('Excluir esta transação?')) return
    router.delete('/finance/transactions/' + id, { preserveScroll: true })
  }

  if (transactions.data.length === 0) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
        Nenhuma transação encontrada com os filtros atuais.
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 160px 110px 60px', padding: '10px 22px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
        <div>Data</div>
        <div>Descrição</div>
        <div>Categoria</div>
        <div>Conta</div>
        <div style={{ textAlign: 'right' }}>Valor</div>
        <div></div>
      </div>

      {transactions.data.map((t, i) => {
        const sign  = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔'
        const color = t.type === 'income' ? 'var(--green)' : t.type === 'expense' ? 'var(--rose)' : 'var(--text-3)'
        return (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 160px 110px 60px', padding: '12px 22px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', fontSize: 13 }}>
            <div className="mono muted" style={{ fontSize: 11 }}>{fmtDate(t.occurred_at)}</div>
            <div style={{ color: 'var(--text-2)', fontWeight: 500 }}>{t.description}</div>
            <div className="muted">{t.category ?? '—'}</div>
            <div className="muted mono" style={{ fontSize: 11 }}>{t.account?.name ?? '—'}</div>
            <div className="mono" style={{ textAlign: 'right', color, fontWeight: 600 }}>
              {sign} {fmtBRL(Math.abs(t.amount))}
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              {!t.is_transfer && (
                <button className="icon-btn" style={{ width: 24, height: 24, color: 'var(--rose)' }} aria-label="Excluir transação" onClick={() => handleDelete(t.id)}>
                  <Icons.Trash size={11} />
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1px solid var(--line-soft)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
          {transactions.total} resultados · página {transactions.current_page} de {transactions.last_page}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" disabled={!transactions.prev_page_url} onClick={() => go(transactions.prev_page_url)}>
            ← Anterior
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!transactions.next_page_url} onClick={() => go(transactions.next_page_url)}>
            Próxima →
          </button>
        </div>
      </div>
    </div>
  )
}
