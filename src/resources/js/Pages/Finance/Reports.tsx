import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { fmtBRL } from '@/lib/finance/formatters'

interface CategoryRow {
  name: string
  total: number
  count: number
  pct: number
}

interface Props {
  categories: CategoryRow[]
  total_expense: number
  total_income: number
  from: string
  to: string
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
  { key: '3m', label: '3 meses', range: () => ({ from: ymd(monthsAgo(3)), to: ymd(new Date()) }) },
  { key: '6m', label: '6 meses', range: () => ({ from: ymd(monthsAgo(6)), to: ymd(new Date()) }) },
  { key: '12m', label: '12 meses', range: () => ({ from: ymd(monthsAgo(12)), to: ymd(new Date()) }) },
]

export default function Reports({ categories, total_expense, total_income, from, to }: Props) {
  const balance = total_income - total_expense

  function setRange(from: string, to: string) {
    router.get('/finance/reports', { from, to }, { preserveScroll: true, preserveState: true, replace: true })
  }

  function activePreset(): string {
    for (const p of PRESETS) {
      const r = p.range()
      if (r.from === from && r.to === to) return p.key
    }
    return 'custom'
  }

  const active = activePreset()

  return (
    <AppLayout
      title="Relatórios"
      eyebrow="Finanças"
      subtitle={`Despesas por categoria · ${from} a ${to}`}
      actions={
        <div className="seg">
          {PRESETS.map(p => (
            <button key={p.key} data-active={active === p.key} onClick={() => { const r = p.range(); setRange(r.from, r.to) }}>
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stat cards */}
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

        {/* Filtro custom */}
        <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="kicker">Período personalizado</div>
          <input
            type="date"
            className="input"
            value={from}
            onChange={e => setRange(e.target.value, to)}
            style={{ width: 160 }}
          />
          <span className="muted">até</span>
          <input
            type="date"
            className="input"
            value={to}
            onChange={e => setRange(from, e.target.value)}
            style={{ width: 160 }}
          />
        </div>

        {/* Tabela de categorias */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Despesas por categoria</div>
            <div className="mono muted" style={{ fontSize: 11 }}>{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}</div>
          </div>

          {categories.length === 0 ? (
            <div style={{ padding: 32, color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
              Nenhuma despesa no período selecionado.
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 1fr 100px 110px', padding: '12px 24px', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--line-soft)' }}>
                <div></div>
                <div>Categoria</div>
                <div style={{ textAlign: 'right' }}>Lançam.</div>
                <div></div>
                <div style={{ textAlign: 'right' }}>%</div>
                <div style={{ textAlign: 'right' }}>Total</div>
              </div>
              {categories.map((c, i) => {
                const color = PALETTE[i % PALETTE.length]
                return (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 1fr 100px 110px', alignItems: 'center', padding: '14px 24px', borderTop: i ? '1px solid var(--line-soft)' : 'none', fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <div style={{ color: 'var(--text-2)', fontWeight: 500 }}>{c.name}</div>
                    <div className="mono muted" style={{ fontSize: 12, textAlign: 'right' }}>{c.count}</div>
                    <div style={{ paddingLeft: 16, paddingRight: 16 }}>
                      <div className="meter" style={{ height: 6 }}>
                        <span style={{ width: c.pct + '%', background: color }} />
                      </div>
                    </div>
                    <div className="mono" style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: 12 }}>{c.pct}%</div>
                    <div className="mono" style={{ textAlign: 'right', color: 'var(--text)', fontWeight: 500 }}>{fmtBRL(c.total)}</div>
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
