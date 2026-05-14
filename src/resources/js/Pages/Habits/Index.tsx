import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { Habit, HealthMetric } from '@/types'
import HabitCard from './components/HabitCard'
import HabitDrawer from './components/HabitDrawer'
import HealthMetricsPanel from './components/HealthMetricsPanel'

interface Props {
    habits: Habit[]
    today_metrics: HealthMetric | null
    today: string
    consistency: { labels: string[]; data: number[] }
    insights: { avg_rate: number; best_streak: number; current_streak: number }
}

function AreaChart({ data, h = 120, accent = 'var(--green)', labels }: {
    data: number[]; h?: number; accent?: string; labels: string[]
}) {
    if (data.length < 2) return null
    const w = 600
    const min = Math.min(...data) * 0.9
    const max = Math.max(...data) * 1.1 || 1
    const range = max - min || 1
    const pad = 24
    const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2)
        const y = h - 24 - ((v - min) / range) * (h - 48)
        return [x, y] as [number, number]
    })
    const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
    const areaPath = linePath + ` L${pts[pts.length - 1][0]},${h - 24} L${pts[0][0]},${h - 24} Z`
    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
            <defs>
                <linearGradient id="hab-area-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#hab-area-grad)" />
            <path d={linePath} fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            {labels.map((l, i) => {
                const x = pad + (i / (labels.length - 1)) * (w - pad * 2)
                return <text key={i} x={x} y={h - 6} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
            })}
        </svg>
    )
}

export default function HabitsIndex({ habits, today_metrics, today, consistency, insights }: Props) {
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

                {/* Consistência e Insights */}
                <div className="grid g-12-5" style={{ marginTop: 24 }}>
                    <div className="card">
                        <div className="card-head">
                            <div className="card-title">Consistência · <b>12 semanas</b></div>
                        </div>
                        <AreaChart data={consistency.data} labels={consistency.labels} h={120} />
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <div className="card-title">Insights</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <div className="kicker">Taxa média das últimas 12 semanas</div>
                                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)', marginTop: 4 }}>{insights.avg_rate}%</div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', gap: 24 }}>
                                <div>
                                    <div className="kicker">Streak atual</div>
                                    <div className="mono" style={{ fontSize: 20, color: 'var(--text)', marginTop: 4 }}>{insights.current_streak} dias</div>
                                </div>
                                <div>
                                    <div className="kicker">Melhor streak</div>
                                    <div className="mono" style={{ fontSize: 20, color: 'var(--text)', marginTop: 4 }}>{insights.best_streak} dias</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {drawerOpen && <HabitDrawer habit={editingHabit} onClose={closeDrawer} />}
        </AppLayout>
    )
}
