import { useState } from 'react'
import { JournalEntry } from '@/types'

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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="text-slate-500 hover:text-slate-300 px-2 py-1 rounded">‹</button>
                <span className="text-sm font-medium text-slate-300">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                    onClick={nextMonth}
                    disabled={currentYear === todayDate.getFullYear() && currentMonth >= todayDate.getMonth()}
                    className="text-slate-500 hover:text-slate-300 px-2 py-1 rounded disabled:opacity-30"
                >›</button>
            </div>

            <div className="grid grid-cols-7 mb-2">
                {WEEKDAY_LABELS.map(d => (
                    <div key={d} className="text-center text-xs text-slate-600 pb-1">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, idx) => {
                    if (!day) return <div key={`blank-${idx}`} />
                    const future = isFuture(day)
                    return (
                        <button
                            key={day}
                            onClick={() => !future && onSelectDate(toDateString(currentYear, currentMonth, day))}
                            disabled={future}
                            className={`
                                relative flex flex-col items-center py-1 rounded-lg text-xs transition-colors
                                ${future ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                ${isSelected(day) ? 'bg-indigo-600 text-white' : ''}
                                ${isToday(day) && !isSelected(day) ? 'ring-1 ring-indigo-500 text-indigo-400' : ''}
                                ${!isSelected(day) && !isToday(day) && !future ? 'text-slate-400 hover:bg-slate-800' : ''}
                            `}
                        >
                            {day}
                            {hasEntry(day) && (
                                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected(day) ? 'bg-white/60' : 'bg-indigo-500'}`} />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
