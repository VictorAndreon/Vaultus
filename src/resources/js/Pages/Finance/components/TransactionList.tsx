import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Transaction, PaginatedResponse } from '@/types'
import { Icons } from '@/Components/Icons'

const TRANSACTION_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
  'Educação', 'Vestuário', 'Assinaturas', 'Salário', 'Freelance',
  'Investimento', 'Outros',
]

interface Props {
  transactions: PaginatedResponse<Transaction>
  accountId: number
  onEdit: (t: Transaction) => void
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function TransactionList({ transactions, accountId, onEdit }: Props) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')

  const filtered = transactions.data.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (categoryFilter && t.category !== categoryFilter) return false
    return true
  })

  function handleDelete(id: number) {
    if (!confirm('Excluir esta transação?')) return
    router.delete('/finance/transactions/' + id, {}, { preserveScroll: true })
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div className="seg">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} data-active={typeFilter === f} onClick={() => setTypeFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        <select className="input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {TRANSACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 150px 110px 80px', padding: '9px 20px', color: 'var(--text-4)', fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid var(--line-soft)' }}>
          <div>Data</div><div>Descrição</div><div>Categoria</div><div>Método</div><div style={{ textAlign: 'right' }}>Valor</div><div></div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-4)', fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
            Nenhuma transação encontrada.
          </div>
        ) : (
          filtered.map((t, i) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 150px 110px 80px', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
              <div className="mono muted" style={{ fontSize: 11 }}>{fmtDate(t.occurred_at)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{t.description}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{t.category ?? '—'}</div>
              <div className="mono muted" style={{ fontSize: 11 }}>—</div>
              <div className="mono" style={{ textAlign: 'right', fontWeight: 600, fontSize: 12.5, color: t.type === 'income' ? 'var(--green)' : 'var(--rose)' }}>
                {t.type === 'income' ? '+' : '−'} {fmtBRL(Math.abs(t.amount))}
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => onEdit(t)}>
                  <Icons.Edit size={12} />
                </button>
                <button className="icon-btn" style={{ width: 26, height: 26, color: 'var(--rose)' }} onClick={() => handleDelete(t.id)}>
                  <Icons.Trash size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginação */}
      {transactions.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
            Página {transactions.current_page} de {transactions.last_page}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={transactions.current_page <= 1}
              onClick={() => router.get(window.location.pathname, { page: transactions.current_page - 1 })}>
              ← Anterior
            </button>
            <button className="btn btn-ghost btn-sm" disabled={transactions.current_page >= transactions.last_page}
              onClick={() => router.get(window.location.pathname, { page: transactions.current_page + 1 })}>
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
