import { Link, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { fmtBRL } from '@/lib/finance/formatters'

interface CategoryRow {
  name: string
  total: number
  count: number
  pct: number
  total_previous?: number
  delta_pct?: number | null
}

interface Comparison {
  from: string
  to: string
  total_previous: number
}

interface Props {
  categories: CategoryRow[]
  total_expense: number
  total_income: number
  type: 'income' | 'expense'
  from: string
  to: string
  comparison?: Comparison
}

const PALETTE = [
  'var(--green)', 'var(--gold)', 'var(--sky)', 'var(--rose)',
  'var(--purple, oklch(72% 0.12 290))', 'var(--teal, oklch(76% 0.12 195))',
  'var(--green-bright)', 'var(--text-3)',
]

interface Preset {
  key: string
  label: string
  range: () => { from: string; to: string }
}

function pad(n: number) { return n < 10 ? `0${n}` : String(n) }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function monthsAgo(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n + 1); d.setDate(1)
  return d
}

const PRESETS: Preset[] = [
  { key: 'month', label: 'Este mês', range: () => {
    const n = new Date()
    return { from: ymd(new Date(n.getFullYear(), n.getMonth(), 1)), to: ymd(new Date(n.getFullYear(), n.getMonth() + 1, 0)) }
  }},
  { key: '3m',  label: '3 meses',  range: () => ({ from: ymd(monthsAgo(3)),  to: ymd(new Date()) }) },
  { key: '6m',  label: '6 meses',  range: () => ({ from: ymd(monthsAgo(6)),  to: ymd(new Date()) }) },
  { key: '12m', label: '12 meses', range: () => ({ from: ymd(monthsAgo(12)), to: ymd(new Date()) }) },
]

export default function Reports({ categories, total_expense, total_income, type, from, to, comparison }: Props) {
  const balance = total_income - total_expense
  const totalCurrent = type === 'income' ? total_income : total_expense

  function setQuery(patch: Record<string, string | undefined>) {
    const current: Record<string, string> = { from, to, type }
    if (comparison) current.compare = '1'
    const next = { ...current, ...patch }
    Object.keys(next).forEach(k => { if (next[k] === undefined || next[k] === '') delete next[k] })
    router.get('/finance/reports', next as any, { preserveScroll: true, preserveState: true, replace: true })
  }

  function activePreset(): string {
    for (const p of PRESETS) {
      const r = p.range()
      if (r.from === from && r.to === to) return p.key
    }
    return 'custom'
  }

  const active = activePreset()
  const exportUrl = `/finance/reports/export.csv?from=${from}&to=${to}&type=${type}`

  return (
    <AppLayout
      title="Relatórios"
      eyebrow="Finanças"
      subtitle={`${type === 'income' ? 'Receitas' : 'Despesas'} por categoria · ${from} a ${to}`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href={exportUrl} className="btn btn-ghost btn-sm" download>
            <Icons.ArrowDownRight size={13} /> CSV
          </a>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setQuery({ compare: comparison ? undefined : '1' })}
            style={comparison ? { background: 'color-mix(in oklab, var(--green) 14%, transparent)' } : {}}
          >
            <Icons.Trend size={13} /> Comparar período
          </button>
          <div className="seg">
            {PRESETS.map(p => (
              <button key={p.key} data-active={active === p.key} onClick={() => { const r = p.range(); setQuery(r) }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div className="grid g-3">
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Total de receitas</div>
            <div className="stat-value" style={{ fontSize: 28, color: 'var(--success)' }}>{fmtBRL(total_income)}</div>
            <div className="stat-delta up" style={{ marginTop: 4 }}><Icons.ArrowUpRight size={11} />no período</div>
          </div>
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Total de despesas</div>
            <div className="stat-value" style={{ fontSize: 28, color: 'var(--rose)' }}>{fmtBRL(total_expense)}</div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>no período</div>
          </div>
          <div className="stat" style={{ padding: '22px 24px' }}>
            <div className="stat-label">Saldo</div>
            <div className="stat-value" style={{ fontSize: 28, color: balance >= 0 ? 'var(--success)' : 'var(--rose)' }}>
              {fmtBRL(balance)}
            </div>
            <div className="stat-delta flat" style={{ marginTop: 4 }}>receita − despesa</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="seg" style={{ flex: 'none' }}>
            <button data-active={type === 'expense'} onClick={() => setQuery({ type: 'expense' })}>Despesas</button>
            <button data-active={type === 'income'}  onClick={() => setQuery({ type: 'income' })}>Receitas</button>
          </div>
          <div style={{ width: 1, height: 22, background: 'var(--line)' }} />
          <div className="kicker">Período</div>
          <input type="date" className="input" value={from} onChange={e => setQuery({ from: e.target.value })} style={{ width: 160 }} />
          <span className="muted">até</span>
          <input type="date" className="input" value={to} onChange={e => setQuery({ to: e.target.value })} style={{ width: 160 }} />
          {comparison && (
            <div className="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
              Comparando com {comparison.from} → {comparison.to} (total: {fmtBRL(comparison.total_previous)})
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">{type === 'income' ? 'Receitas' : 'Despesas'} por categoria</div>
            <div className="mono muted" style={{ fontSize: 11 }}>{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}</div>
          </div>

          {categories.length === 0 ? (
            <div style={{ padding: 32, color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
              Nenhum lançamento no período selecionado.
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: comparison ? '24px 1fr 70px 1fr 70px 90px 110px 30px' : '24px 1fr 80px 1fr 100px 110px 30px', padding: '12px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
                <div></div>
                <div>Categoria</div>
                <div style={{ textAlign: 'right' }}>Lançam.</div>
                <div></div>
                {comparison && <div style={{ textAlign: 'right' }}>Δ</div>}
                <div style={{ textAlign: 'right' }}>%</div>
                <div style={{ textAlign: 'right' }}>Total</div>
                <div></div>
              </div>
              {categories.map((c, i) => {
                const color = PALETTE[i % PALETTE.length]
                const drillUrl = `/finance/transactions?categories=${encodeURIComponent(c.name)}&date_from=${from}&date_to=${to}&types=${type}`
                const deltaColor = c.delta_pct == null
                  ? 'var(--text-4)'
                  : (c.delta_pct > 0 ? (type === 'expense' ? 'var(--rose)' : 'var(--success)') : (type === 'expense' ? 'var(--success)' : 'var(--rose)'))
                return (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: comparison ? '24px 1fr 70px 1fr 70px 90px 110px 30px' : '24px 1fr 80px 1fr 100px 110px 30px', alignItems: 'center', padding: '14px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <div style={{ color: 'var(--text-2)', fontWeight: 500 }}>{c.name}</div>
                    <div className="mono muted" style={{ fontSize: 12, textAlign: 'right' }}>{c.count}</div>
                    <div style={{ paddingLeft: 16, paddingRight: 16 }}>
                      <div className="meter" style={{ height: 6 }}>
                        <span style={{ width: c.pct + '%', background: color }} />
                      </div>
                    </div>
                    {comparison && (
                      <div className="mono" style={{ textAlign: 'right', fontSize: 11, color: deltaColor }}>
                        {c.delta_pct == null ? 'novo' : (c.delta_pct > 0 ? `+${c.delta_pct}%` : `${c.delta_pct}%`)}
                      </div>
                    )}
                    <div className="mono" style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: 12 }}>{c.pct}%</div>
                    <div className="mono" style={{ textAlign: 'right', color: 'var(--text)', fontWeight: 500 }}>{fmtBRL(c.total)}</div>
                    <Link href={drillUrl} className="icon-btn" title="Ver transações" style={{ width: 24, height: 24, marginLeft: 'auto' }}>
                      <Icons.ChevronRight size={11} />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
