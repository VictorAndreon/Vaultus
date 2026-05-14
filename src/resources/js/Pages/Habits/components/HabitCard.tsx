import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import { Habit } from '@/types'

interface Props { habit: Habit; today: string; onEdit: (h: Habit) => void; isFirst: boolean }

const WEEK = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

export default function HabitCard({ habit, today, onEdit, isFirst }: Props) {
    const [checkedIn, setCheckedIn] = useState(habit.checked_in_today)
    const color = checkedIn ? 'var(--green)' : 'var(--gold)'

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

    // Week dots — last 7 days
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
    })

    const rate = Math.round(
        (habit.recent_check_ins?.filter(d => {
            const cutoff = new Date(today)
            cutoff.setDate(cutoff.getDate() - 29)
            return new Date(d) >= cutoff
        }).length ?? 0) / 30 * 100
    )

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 100px 120px', padding: '18px 24px', borderTop: isFirst ? 'none' : '1px solid var(--line-soft)', alignItems: 'center' }}>
            {/* Hábito */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 50, background: color }} />
                    <div className="h-3">{habit.name}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, marginLeft: 18 }}>
                    {habit.icon ?? ''} {habit.frequency_type === 'daily' ? 'Todo dia' : `${habit.frequency_times}x · semana`}
                </div>
            </div>

            {/* Esta semana — 7 dots */}
            <div style={{ display: 'flex', gap: 6 }}>
                {last7.map((date, di) => {
                    const done = habit.recent_check_ins?.includes(date)
                    const isToday = date === today
                    return (
                        <div key={di} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: isToday ? 'var(--green)' : 'var(--text-4)', textTransform: 'uppercase' }}>{WEEK[di]}</div>
                            <div style={{ width: 18, height: 18, borderRadius: 5, background: done ? color : 'transparent', border: done ? 'none' : '1px dashed var(--line-2)', display: 'grid', placeItems: 'center' }}>
                                {done && <Icons.Check size={11} style={{ color: 'var(--bg)' }} />}
                            </div>
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
                {habit.current_streak ?? 0} <span style={{ color: 'var(--text-4)', fontSize: 11 }}>dias</span>
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
