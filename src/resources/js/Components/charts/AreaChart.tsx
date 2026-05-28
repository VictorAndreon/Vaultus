import { useState, useId } from 'react'

interface Point {
  label: string
  value: number
}

interface DualSeries {
  income: number[]
  expense: number[]
  labels: string[]
  /** Color of income series (default var(--green)) */
  incomeColor?: string
  /** Color of expense series (default var(--gold)) */
  expenseColor?: string
  /** Optional formatter for tooltip values */
  format?: (n: number) => string
}

interface Props {
  /** Single series mode */
  data?: Point[]
  /** Dual-series mode (income vs expense). When set, ignores `data`. */
  dual?: DualSeries
  height?: number
  accent?: string
  showEndDot?: boolean
  /** Render a vertical gradient under the line. Default true. */
  gradient?: boolean
  /** Render horizontal dashed gridlines. Default false. */
  gridlines?: boolean
  /** Enable hover tooltip with crosshair (dual mode only). Default false. */
  showTooltip?: boolean
}

const PAD_X = 24
const PAD_TOP = 12
const PAD_BOTTOM = 28
const VB_W = 1000

export default function AreaChart({
  data,
  dual,
  height = 200,
  accent = 'var(--green)',
  showEndDot = true,
  gradient = true,
  gridlines = false,
  showTooltip = false,
}: Props) {
  if (dual) return <DualChart series={dual} height={height} gridlines={gridlines} showTooltip={showTooltip} />
  if (!data || data.length < 2) return null
  return (
    <SingleChart
      data={data}
      height={height}
      accent={accent}
      showEndDot={showEndDot}
      gradient={gradient}
      gridlines={gridlines}
    />
  )
}

function gridlineRows(h: number) {
  const innerH = h - PAD_TOP - PAD_BOTTOM
  return [0, 1, 2, 3].map((i) => PAD_TOP + i * (innerH / 3))
}

function SingleChart({
  data, height, accent, showEndDot, gradient, gridlines,
}: {
  data: Point[]
  height: number
  accent: string
  showEndDot: boolean
  gradient: boolean
  gridlines: boolean
}) {
  const id = useId().replace(/:/g, '')
  const innerH = height - PAD_TOP - PAD_BOTTOM
  const w = VB_W - PAD_X * 2

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = w / (data.length - 1)

  const pts = data.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + (1 - (p.value - min) / range) * innerH,
    label: p.label,
  }))

  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  const areaPath = `${linePath} L${last.x.toFixed(2)},${height - PAD_BOTTOM} L${first.x.toFixed(2)},${height - PAD_BOTTOM} Z`

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden="true"
    >
      {gradient && (
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {gridlines && gridlineRows(height).map((y, i) => (
        <line key={i} x1={PAD_X} x2={VB_W - PAD_X} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
      ))}
      <path d={areaPath} fill={gradient ? `url(#grad-${id})` : accent} fillOpacity={gradient ? 1 : 0.14} />
      <path d={linePath} fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {showEndDot && (
        <circle cx={last.x} cy={last.y} r="3.5" fill="var(--bg)" stroke={accent} strokeWidth={1.5} />
      )}
      {pts.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 10}
          fontSize="10"
          fontFamily="var(--mono)"
          fill="var(--text-3)"
          textAnchor="middle"
        >
          {p.label}
        </text>
      ))}
    </svg>
  )
}

function DualChart({
  series, height, gridlines, showTooltip,
}: {
  series: DualSeries
  height: number
  gridlines: boolean
  showTooltip: boolean
}) {
  const { income, expense, labels, incomeColor = 'var(--green)', expenseColor = 'var(--gold)', format } = series
  const [hover, setHover] = useState<number | null>(null)
  const innerH = height - PAD_TOP - PAD_BOTTOM
  const w = VB_W - PAD_X * 2
  const all = [...income, ...expense]
  if (all.length === 0 || labels.length < 2) return null
  const min = Math.min(...all) * 0.9
  const max = Math.max(...all) * 1.1 || 1
  const range = max - min || 1

  const ptX = (i: number) => PAD_X + (i / (labels.length - 1)) * w
  const ptY = (v: number) => PAD_TOP + (1 - (v - min) / range) * innerH
  const toLine = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${ptX(i).toFixed(2)},${ptY(v).toFixed(2)}`).join(' ')
  const zoneW = w / (labels.length - 1)

  const fmt = format ?? ((n) => n.toFixed(0))

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${VB_W} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {gridlines && gridlineRows(height).map((y, i) => (
          <line key={i} x1={PAD_X} x2={VB_W - PAD_X} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
        ))}
        <path d={toLine(income)} fill="none" stroke={incomeColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={toLine(expense)} fill="none" stroke={expenseColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />
        {labels.map((l, i) => (
          <text key={i} x={ptX(i)} y={height - 10} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
        ))}
        {showTooltip && hover !== null && (
          <>
            <line x1={ptX(hover)} x2={ptX(hover)} y1={PAD_TOP} y2={height - PAD_BOTTOM} stroke="var(--line)" strokeWidth={1} />
            <circle cx={ptX(hover)} cy={ptY(income[hover])} r={3.5} fill={incomeColor} />
            <circle cx={ptX(hover)} cy={ptY(expense[hover])} r={3.5} fill={expenseColor} />
          </>
        )}
        {showTooltip && labels.map((_, i) => (
          <rect key={i} x={ptX(i) - zoneW / 2} y={0} width={zoneW} height={height - 12}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      {showTooltip && hover !== null && (() => {
        const net = income[hover] - expense[hover]
        const leftPct = ((ptX(hover) / VB_W) * 100).toFixed(1)
        return (
          <div style={{
            position: 'absolute', top: 4, left: `${leftPct}%`,
            transform: hover < labels.length / 2 ? 'translateX(8px)' : 'translateX(calc(-100% - 8px))',
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            borderRadius: 8, padding: '8px 12px', fontSize: 11,
            fontFamily: 'var(--mono)', pointerEvents: 'none', zIndex: 10,
            whiteSpace: 'nowrap', boxShadow: 'var(--shadow-2)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{labels[hover]}</div>
            <div style={{ color: incomeColor, marginBottom: 2 }}>↑ {fmt(income[hover])}</div>
            <div style={{ color: expenseColor, marginBottom: 5 }}>↓ {fmt(expense[hover])}</div>
            <div style={{ color: net >= 0 ? 'var(--green)' : 'var(--rose)', borderTop: '1px solid var(--line-soft)', paddingTop: 4 }}>
              {net >= 0 ? '+' : ''}{fmt(net)}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
