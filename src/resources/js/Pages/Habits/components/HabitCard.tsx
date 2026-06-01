import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import { Habit } from '@/types'
import FrequencyBadge from './FrequencyBadge'

interface Props { habit: Habit; today: string; onEdit: (h: Habit) => void; isFirst: boolean }

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function HabitCard({ habit, today, onEdit, isFirst }: Props) {
    const [checkedIn, setCheckedIn] = useState(habit.checked_in_today)
    const color = habit.color ?? 'var(--green)'

    const toggle = () => {
        const prev = checkedIn
        setCheckedIn(!prev)
        const method = prev ? 'delete' : 'post'
        router[method](`/habits/${habit.id}/check-in`, {}, {
            preserveState: true, preserveScroll: true,
            onError: () => setCheckedIn(prev),
        })
    }

    const archive = () => {
        router.delete(`/habits/${habit.id}`, {}, { preserveScroll: true })
    }

    // Week dots — Seg–Dom da semana atual. Derivado de `today` (já no timezone
    // do usuário) em UTC, para não depender do fuso do navegador.
    const [ty, tm, td] = today.split('-').map(Number)
    const todayUTC = new Date(Date.UTC(ty, tm - 1, td))
    const dayOfWeek = todayUTC.getUTCDay() // 0=dom, 1=seg...
    const monday = new Date(todayUTC)
    monday.setUTCDate(todayUTC.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setUTCDate(monday.getUTCDate() + i)
        return d.toISOString().slice(0, 10)
    })

    // Taxa de 30 dias calculada no backend (coerente com a frequência do hábito).
    const rate = habit.rate_30d ?? 0

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 100px 120px', padding: '18px 24px', borderTop: isFirst ? 'none' : '1px solid var(--line-soft)', alignItems: 'center' }}>
            {/* Hábito */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 50, background: color }} />
                    <div className="h-3">{habit.name}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, marginLeft: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {habit.icon && <span>{habit.icon}</span>}
                    <FrequencyBadge
                        frequencyType={habit.frequency_type}
                        frequencyDays={habit.frequency_days}
                        frequencyTimes={habit.frequency_times}
                    />
                </div>
            </div>

            {/* Esta semana — dots Seg-Dom */}
            <div style={{ display: 'flex', gap: 6 }}>
                {weekDates.map((dateStr, i) => {
                    const filled = habit.recent_check_ins?.includes(dateStr) ?? false
                    const isToday = dateStr === today
                    return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                background: filled ? color : 'transparent',
                                border: filled ? 'none' : `1.5px ${isToday ? 'solid' : 'dashed'} ${isToday ? color : 'var(--line-2)'}`,
                            }} />
                            <span style={{ fontSize: 9.5, color: isToday ? color : 'var(--text-4)', fontFamily: 'var(--mono)' }}>
                                {WEEK_LABELS[i]}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Taxa 30d */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="meter" style={{ flex: 1 }}><span style={{ width: `${rate}%`, background: color }} /></div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{rate}%</span>
                </div>
            </div>

            {/* Streak */}
            <div className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
                {habit.current_streak ?? 0} <span style={{ color: 'var(--text-4)', fontSize: 11 }}>{habit.streak_unit ?? 'dias'}</span>
            </div>

            {/* Ações */}
            <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="btn btn-soft btn-sm" onClick={toggle}>
                    <Icons.Check size={12} /> Hoje
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(habit)}>
                    <Icons.Edit size={12} />
                </button>
            </div>
        </div>
    )
}
