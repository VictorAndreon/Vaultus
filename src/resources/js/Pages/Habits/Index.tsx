import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Habit, HealthMetric } from '@/types'
import HabitCard from './components/HabitCard'
import HabitDrawer from './components/HabitDrawer'
import HealthMetricsPanel from './components/HealthMetricsPanel'
import Button from '@/Components/ui/Button'

interface Props {
    habits: Habit[]
    today_metrics: HealthMetric | null
    today: string
}

export default function HabitsIndex({ habits, today_metrics, today }: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

    const openCreate = () => {
        setEditingHabit(null)
        setDrawerOpen(true)
    }

    const openEdit = (habit: Habit) => {
        setEditingHabit(habit)
        setDrawerOpen(true)
    }

    const closeDrawer = () => {
        setDrawerOpen(false)
        setEditingHabit(null)
    }

    return (
        <AppLayout title="Hábitos">
            <div className="max-w-2xl space-y-4">
                <HealthMetricsPanel todayMetrics={today_metrics} />

                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                        Seus hábitos
                    </h2>
                    <Button size="sm" onClick={openCreate}>+ Novo hábito</Button>
                </div>

                {habits.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-sm">
                        Nenhum hábito ainda.{' '}
                        <button
                            onClick={openCreate}
                            className="text-indigo-400 hover:text-indigo-300"
                        >
                            Criar o primeiro
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {habits.map(habit => (
                            <HabitCard
                                key={habit.id}
                                habit={habit}
                                today={today}
                                onEdit={openEdit}
                            />
                        ))}
                    </div>
                )}
            </div>

            {drawerOpen && (
                <HabitDrawer habit={editingHabit} onClose={closeDrawer} />
            )}
        </AppLayout>
    )
}
