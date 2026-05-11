import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Habit } from '@/types'
import FrequencyBadge from './FrequencyBadge'
import StreakDisplay from './StreakDisplay'
import Button from '@/Components/ui/Button'

interface Props {
    habit: Habit
    today: string
    onEdit: (habit: Habit) => void
}

export default function HabitCard({ habit, today, onEdit }: Props) {
    const [expanded, setExpanded] = useState(false)
    const [checkedIn, setCheckedIn] = useState(habit.checked_in_today)

    const toggle = () => {
        const wasChecked = checkedIn
        setCheckedIn(!wasChecked)

        const url = `/habits/${habit.id}/check-in`
        const method = wasChecked ? 'delete' : 'post'

        router[method](url, {}, {
            preserveState: true,
            preserveScroll: true,
            onError: () => setCheckedIn(wasChecked),
        })
    }

    const archive = () => {
        router.delete(`/habits/${habit.id}`, {}, {
            preserveScroll: true,
        })
    }

    // Mini-calendário: últimos 7 dias
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
    })

    return (
        <div className={`bg-slate-900 border rounded-xl transition-colors ${
            checkedIn ? 'border-indigo-500/40' : 'border-slate-800'
        }`}>
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpanded(e => !e)}
            >
                <span className="text-xl">{habit.icon ?? '⭐'}</span>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                        checkedIn ? 'text-slate-300 line-through decoration-indigo-500' : 'text-slate-200'
                    }`}>
                        {habit.name}
                    </p>
                    <div className="mt-0.5">
                        <FrequencyBadge
                            frequencyType={habit.frequency_type}
                            frequencyDays={habit.frequency_days}
                            frequencyTimes={habit.frequency_times}
                        />
                    </div>
                </div>
                <button
                    onClick={e => { e.stopPropagation(); toggle() }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        checkedIn
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                >
                    {checkedIn ? '✓' : '○'}
                </button>
            </div>

            {/* Conteúdo expandido */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-800 pt-4 space-y-4">
                    <StreakDisplay
                        currentStreak={habit.current_streak}
                        bestStreak={habit.best_streak}
                        frequencyType={habit.frequency_type}
                    />

                    {/* Mini-calendário 7 dias */}
                    <div className="flex gap-1.5">
                        {last7.map(date => (
                            <div key={date} className="flex flex-col items-center gap-1">
                                <div className={`w-6 h-6 rounded-full ${
                                    habit.recent_check_ins.includes(date)
                                        ? 'bg-indigo-600'
                                        : date === today
                                        ? 'bg-slate-700 ring-1 ring-indigo-500'
                                        : 'bg-slate-800'
                                }`} />
                                <span className="text-xs text-slate-600">
                                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' })}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Progresso semanal para x_per_week */}
                    {habit.frequency_type === 'x_per_week' && habit.frequency_times && (
                        <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Esta semana</span>
                                <span>{habit.week_check_ins_count ?? 0}/{habit.frequency_times}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, ((habit.week_check_ins_count ?? 0) / habit.frequency_times) * 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(habit)}>
                            Editar
                        </Button>
                        <Button variant="danger" size="sm" onClick={archive}>
                            Arquivar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
