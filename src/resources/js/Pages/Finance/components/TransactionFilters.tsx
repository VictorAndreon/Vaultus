import { useState } from 'react'

export interface FilterState {
  types: string[]
  accountIds: number[]
  categories: string[]
  dateFrom: string
  dateTo: string
  search: string
}

interface AccountOption { id: number; name: string; type: string }

interface Props {
  initial: FilterState
  accounts: AccountOption[]
  categories: string[]
  onChange: (s: FilterState) => void
}

const TYPE_OPTIONS = [
  { value: 'income',   label: 'Receitas' },
  { value: 'expense',  label: 'Despesas' },
  { value: 'transfer', label: 'Transferências' },
]

export default function TransactionFilters({ initial, accounts, categories, onChange }: Props) {
  const [state, setState] = useState<FilterState>(initial)

  function patch(p: Partial<FilterState>) {
    const next = { ...state, ...p }
    setState(next)
    onChange(next)
  }

  function toggleType(t: string) {
    const set = new Set(state.types)
    set.has(t) ? set.delete(t) : set.add(t)
    patch({ types: Array.from(set) })
  }

  function toggleAccount(id: number) {
    const set = new Set(state.accountIds)
    set.has(id) ? set.delete(id) : set.add(id)
    patch({ accountIds: Array.from(set) })
  }

  function toggleCategory(c: string) {
    const set = new Set(state.categories)
    set.has(c) ? set.delete(c) : set.add(c)
    patch({ categories: Array.from(set) })
  }

  function clearAll() {
    const empty: FilterState = { types: [], accountIds: [], categories: [], dateFrom: '', dateTo: '', search: '' }
    setState(empty)
    onChange(empty)
  }

  const hasFilters =
    state.types.length || state.accountIds.length || state.categories.length ||
    state.dateFrom || state.dateTo || state.search

  return (
    <div className="card" style={{ padding: 18, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Buscar</label>
          <input
            type="search"
            className="input"
            placeholder="Descrição contém..."
            value={state.search}
            onChange={e => patch({ search: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>De</label>
          <input
            type="date"
            className="input"
            value={state.dateFrom}
            onChange={e => patch({ dateFrom: e.target.value })}
          />
        </div>
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Até</label>
          <input
            type="date"
            className="input"
            value={state.dateTo}
            onChange={e => patch({ dateTo: e.target.value })}
          />
        </div>
        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
            Limpar filtros
          </button>
        )}
      </div>

      <div>
        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {TYPE_OPTIONS.map(t => {
            const active = state.types.includes(t.value)
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleType(t.value)}
                className="btn btn-ghost btn-sm"
                style={{
                  background: active ? 'color-mix(in oklab, var(--green) 14%, transparent)' : undefined,
                  borderColor: active ? 'color-mix(in oklab, var(--green) 50%, transparent)' : undefined,
                  color: active ? 'var(--green)' : undefined,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {accounts.length > 0 && (
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Contas</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {accounts.map(a => {
              const active = state.accountIds.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAccount(a.id)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    background: active ? 'color-mix(in oklab, var(--sky) 14%, transparent)' : undefined,
                    borderColor: active ? 'color-mix(in oklab, var(--sky) 50%, transparent)' : undefined,
                    color: active ? 'var(--sky)' : undefined,
                  }}
                >
                  {a.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div>
          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categorias</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(c => {
              const active = state.categories.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    background: active ? 'color-mix(in oklab, var(--gold) 14%, transparent)' : undefined,
                    borderColor: active ? 'color-mix(in oklab, var(--gold) 50%, transparent)' : undefined,
                    color: active ? 'var(--gold)' : undefined,
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
