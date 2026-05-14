import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Habit, HealthMetric } from '@/types'
import HabitCard from './components/HabitCard'
import HabitDrawer from './components/HabitDrawer'
import HealthMetricsPanel from './components/HealthMetricsPanel'

interface Props { habits: Habit[]; today_metrics: HealthMetric | null; today: string }

export default function HabitsIndex({ habits, today_metrics, today }: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

    const openCreate = () => { setEditingHabit(null); setDrawerOpen(true) }
    const openEdit   = (h: Habit) => { setEditingHabit(h); setDrawerOpen(true) }
    const closeDrawer = () => { setDrawerOpen(false); setEditingHabit(null) }

    return (
        <AppLayout
            title="Hábitos"
            eyebrow="Reflexão"
            subtitle={`Consistência sobre intensidade. ${habits.filter(h => h.checked_in_today).length} completados hoje.`}
            actions={
                <>
                    <div className="seg">
                        <button data-active="true">Semana</button>
                        <button>Mês</button>
                        <button>Ano</button>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={openCreate}>
                        <Icons.Plus size={13} /> Novo hábito
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Métricas de hoje */}
                <HealthMetricsPanel todayMetrics={today_metrics} />

                {/* Tabela de hábitos */}
                {habits.length === 0 ? (
                    <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
                            Nenhum hábito ainda.{' '}
                            <button className="card-link" onClick={openCreate}>Criar o primeiro</button>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 100px 120px', padding: '14px 24px', borderBottom: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <div>Hábito</div>
                            <div>Esta semana</div>
                            <div>Taxa · 30d</div>
                            <div>Streak</div>
                            <div></div>
                        </div>
                        {habits.map((h, i) => (
                            <HabitCard key={h.id} habit={h} today={today} onEdit={openEdit} isFirst={i === 0} />
                        ))}
                    </div>
                )}
            </div>

            {drawerOpen && <HabitDrawer habit={editingHabit} onClose={closeDrawer} />}
        </AppLayout>
    )
}
