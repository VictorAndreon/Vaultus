import { useState } from 'react'
import { JournalEntry } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props {
    entries: JournalEntry[]
    today: string
    selectedDate: string | null
    onSelectDate: (date: string) => void
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function toDateString(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function JournalCalendar({ entries, today, selectedDate, onSelectDate }: Props) {
    const todayDate = new Date(today + 'T12:00:00')
    const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth())

    const entryDates = new Set(entries.map(e => e.date))

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
        else setCurrentMonth(m => m - 1)
    }

    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
        else setCurrentMonth(m => m + 1)
    }

    const isToday = (day: number) => toDateString(currentYear, currentMonth, day) === today
    const isSelected = (day: number) => toDateString(currentYear, currentMonth, day) === selectedDate
    const hasEntry = (day: number) => entryDates.has(toDateString(currentYear, currentMonth, day))
    const isFuture = (day: number) => toDateString(currentYear, currentMonth, day) > today

    const cells: (number | null)[] = [
        ...Array(firstDayOfMonth).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button onClick={prevMonth} className="btn btn-ghost btn-sm">
                    <Icons.ChevronLeft size={14} />
                </button>
                <span className="card-title">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                    onClick={nextMonth}
                    disabled={currentYear === todayDate.getFullYear() && currentMonth >= todayDate.getMonth()}
                    className="btn btn-ghost btn-sm"
                >
                    <Icons.ChevronRight size={14} />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
                {WEEKDAY_LABELS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-4)', paddingBottom: 4, fontFamily: 'var(--mono)' }}>{d}</div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px 0' }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={`blank-${idx}`} />
                    const future = isFuture(day)
                    const selected = isSelected(day)
                    const today_ = isToday(day)
                    return (
                        <button
                            key={day}
                            onClick={() => !future && onSelectDate(toDateString(currentYear, currentMonth, day))}
                            disabled={future}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '4px 0',
                                fontSize: 12,
                                border: 'none',
                                background: 'transparent',
                                cursor: future ? 'not-allowed' : 'pointer',
                                ...(selected ? { background: 'var(--green)', color: 'var(--bg)', borderRadius: 8 } : {}),
                                ...(today_ && !selected ? { background: 'var(--green-soft)', color: 'var(--green-bright)', borderRadius: 8 } : {}),
                                ...(future ? { opacity: 0.3, cursor: 'not-allowed' } : {}),
                                ...(!selected && !today_ && !future ? { color: 'var(--text-3)' } : {}),
                            }}
                        >
                            {day}
                            {hasEntry(day) && (
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: selected ? 'var(--bg)' : 'var(--green)', margin: '2px auto 0' }} />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
