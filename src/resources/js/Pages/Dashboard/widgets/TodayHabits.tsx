import { Link } from '@inertiajs/react'
import Card from '@/Components/ui/Card'

interface HabitSummary {
    id: number
    name: string
    icon: string | null
    checked_in_today: boolean
}

interface Props {
    habits_today: HabitSummary[]
    done: number
    total: number
}

export default function TodayHabits({ habits_today, done, total }: Props) {
    return (
        <Card title="Hábitos Hoje">
            {total === 0 ? (
                <p className="text-sm text-slate-600">
                    <Link href="/habits" className="text-indigo-400 hover:text-indigo-300">
                        Criar hábitos
                    </Link>
                </p>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-400">{done}/{total} concluídos</span>
                        <Link href="/habits" className="text-xs text-indigo-400 hover:text-indigo-300">
                            Ver todos →
                        </Link>
                    </div>
                    <ul className="space-y-1.5">
                        {habits_today.slice(0, 5).map(h => (
                            <li key={h.id} className="flex items-center gap-2 text-sm">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                                    h.checked_in_today ? 'bg-indigo-600' : 'bg-slate-800'
                                }`}>
                                    {h.checked_in_today ? '✓' : ''}
                                </span>
                                <span className="text-slate-500 text-sm">{h.icon}</span>
                                <span className={h.checked_in_today ? 'text-slate-500 line-through' : 'text-slate-300'}>
                                    {h.name}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    )
}
