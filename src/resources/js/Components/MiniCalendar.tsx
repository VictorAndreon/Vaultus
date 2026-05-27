import { useState } from 'react'

interface Props {
  year?: number
  month?: number
  intensity?: Record<number, number>
  today?: number
  entries?: number[]
  onNavigate?: (delta: -1 | 1) => void
}

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function shade(value: number | undefined): string {
  if (value === undefined || value <= 0) return 'transparent'
  if (value < 0.34) return 'oklch(32% 0.06 var(--h))'
  if (value < 0.67) return 'oklch(48% 0.115 var(--h))'
  return 'var(--green)'
}

export default function MiniCalendar({
  year: yearProp,
  month: monthProp,
  intensity = {},
  today,
  entries = [],
  onNavigate,
}: Props) {
  const now = new Date()
  const [year] = useState(yearProp ?? now.getFullYear())
  const [month] = useState(monthProp ?? now.getMonth())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const entriesSet = new Set(entries)

  return (
    <div className="card" style={{ padding: 16, width: 240 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title">
          {MONTH_LABELS[month].toUpperCase().slice(0, 3)} · <b>{year}</b>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => onNavigate?.(-1)} aria-label="Mês anterior">‹</button>
          <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => onNavigate?.(1)} aria-label="Próximo mês">›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-4)', textAlign: 'center', padding: 4 }}
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const isToday = day === today
          const hasEntry = entriesSet.has(day)
          const bg = shade(intensity[day])
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: hasEntry ? 'var(--text)' : 'var(--text-4)',
                borderRadius: 4,
                background: bg,
                border: isToday ? '1px solid var(--green)' : '1px solid transparent',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
