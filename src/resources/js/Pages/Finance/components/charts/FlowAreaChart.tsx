import { useState } from 'react'
import { fmtBRL } from '@/lib/finance/formatters'

interface Props {
  income: number[]
  expense: number[]
  labels: string[]
  h?: number
}

export default function FlowAreaChart({ income, expense, labels, h = 160 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  const w = 600, pad = 24
  const allVals = [...income, ...expense]
  if (allVals.length === 0) return null
  const min = Math.min(...allVals) * 0.9
  const max = Math.max(...allVals) * 1.1 || 1
  const range = max - min || 1
  const n = labels.length
  const ptX = (i: number) => pad + (n > 1 ? (i / (n - 1)) : 0.5) * (w - pad * 2)
  const ptY = (v: number) => h - 24 - ((v - min) / range) * (h - 48)
  const toLine = (data: number[]) => data.map((v, i) => `${i ? 'L' : 'M'}${ptX(i).toFixed(1)},${ptY(v).toFixed(1)}`).join(' ')
  const zoneW = n > 1 ? (w - pad * 2) / (n - 1) : w - pad * 2

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        {[0,1,2,3].map(i => <line key={i} x1={pad} x2={w-pad} y1={24+i*((h-48)/3)} y2={24+i*((h-48)/3)} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />)}
        <path d={toLine(income)} fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toLine(expense)} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />
        {labels.map((l, i) => (
          <text key={i} x={ptX(i)} y={h-6} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
        ))}
        {hovered !== null && (
          <>
            <line x1={ptX(hovered)} x2={ptX(hovered)} y1={20} y2={h-24} stroke="var(--line)" strokeWidth={1} />
            <circle cx={ptX(hovered)} cy={ptY(income[hovered])} r={3.5} fill="var(--green)" />
            <circle cx={ptX(hovered)} cy={ptY(expense[hovered])} r={3.5} fill="var(--gold)" />
          </>
        )}
        {labels.map((_, i) => (
          <rect key={i} x={ptX(i) - zoneW / 2} y={0} width={zoneW} height={h - 12}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        ))}
      </svg>
      {hovered !== null && (() => {
        const net = income[hovered] - expense[hovered]
        const leftPct = (ptX(hovered) / w * 100).toFixed(1)
        return (
          <div style={{
            position: 'absolute', top: 4, left: `${leftPct}%`,
            transform: hovered < n / 2 ? 'translateX(8px)' : 'translateX(calc(-100% - 8px))',
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            borderRadius: 8, padding: '8px 12px', fontSize: 11,
            fontFamily: 'var(--mono)', pointerEvents: 'none', zIndex: 10,
            whiteSpace: 'nowrap', boxShadow: 'var(--shadow-2)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{labels[hovered]}</div>
            <div style={{ color: 'var(--green)', marginBottom: 2 }}>↑ {fmtBRL(income[hovered])}</div>
            <div style={{ color: 'var(--gold)', marginBottom: 5 }}>↓ {fmtBRL(expense[hovered])}</div>
            <div style={{ color: net >= 0 ? 'var(--green)' : 'var(--rose)', borderTop: '1px solid var(--line-soft)', paddingTop: 4 }}>
              {net >= 0 ? '+' : ''}{fmtBRL(net)}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
