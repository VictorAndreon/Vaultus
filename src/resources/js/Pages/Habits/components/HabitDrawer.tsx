import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Habit, FrequencyType } from '@/types'
import StreakDisplay from './StreakDisplay'

interface Props {
    habit: Habit | null   // null = criar novo
    onClose: () => void
}

const DAY_OPTIONS = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sab' },
]

const errorStyle: React.CSSProperties = { color: 'var(--danger)', fontSize: 11, marginTop: 4 }

export default function HabitDrawer({ habit, onClose }: Props) {
    const isEditing = !!habit
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    const [form, setForm] = useState({
        name:            habit?.name            ?? '',
        icon:            habit?.icon            ?? '',
        category:        habit?.category        ?? '',
        frequency_type:  (habit?.frequency_type ?? 'daily') as FrequencyType,
        frequency_days:  habit?.frequency_days  ?? [] as number[],
        frequency_times: habit?.frequency_times ?? 3,
    })

    useEffect(() => {
        if (habit) {
            setForm({
                // `?? ''` evita que form.name vire undefined — o submit faz
                // form.name.trim() e, sem ErrorBoundary, um throw aqui apaga a tela.
                name:            habit.name ?? '',
                icon:            habit.icon ?? '',
                category:        habit.category ?? '',
                frequency_type:  habit.frequency_type,
                frequency_days:  habit.frequency_days ?? [],
                frequency_times: habit.frequency_times ?? 3,
            })
        }
    }, [habit])

    const toggleDay = (day: number) => {
        setForm(f => ({
            ...f,
            frequency_days: f.frequency_days.includes(day)
                ? f.frequency_days.filter(d => d !== day)
                : [...f.frequency_days, day].sort((a, b) => a - b),
        }))
    }

    const submit = () => {
        const payload = {
            name:            form.name,
            icon:            form.icon || null,
            category:        form.category || null,
            frequency_type:  form.frequency_type,
            frequency_days:  form.frequency_type === 'weekly' ? form.frequency_days : null,
            frequency_times: form.frequency_type === 'x_per_week' ? form.frequency_times : null,
        }

        const options = {
            preserveScroll: true,
            onStart:   () => { setSubmitting(true); setErrors({}) },
            onError:   (e: Record<string, string>) => setErrors(e),
            onSuccess: onClose,
            onFinish:  () => setSubmitting(false),
        }

        if (isEditing) {
            router.patch(`/habits/${habit.id}`, payload, options)
        } else {
            router.post('/habits', payload, options)
        }
    }

    return (
        <>
            {/* Overlay */}
            <div
                style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40 }}
                onClick={onClose}
            />

            {/* Drawer */}
            <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: 320, background: 'var(--surface)', borderLeft: '1px solid var(--line)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                    <h2 style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>
                        {isEditing ? 'Editar hábito' : 'Novo hábito'}
                    </h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm">×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Streak atual (apenas ao editar) */}
                    {isEditing && habit && (
                        <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>
                            <StreakDisplay
                                currentStreak={habit.current_streak}
                                bestStreak={habit.best_streak}
                                frequencyType={habit.frequency_type}
                            />
                        </div>
                    )}

                    {/* Nome */}
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="input"
                            placeholder="Ex: Meditar"
                        />
                        {errors.name && <div style={errorStyle}>{errors.name}</div>}
                    </div>

                    {/* Ícone */}
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Ícone (emoji)</label>
                        <input
                            type="text"
                            value={form.icon}
                            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                            maxLength={2}
                            className="input"
                            style={{ width: 64, textAlign: 'center' }}
                            placeholder="⭐"
                        />
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
                        <input
                            type="text"
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            className="input"
                            placeholder="Ex: Saúde, Estudo..."
                        />
                    </div>

                    {/* Frequência */}
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Frequência *</label>
                        <select
                            value={form.frequency_type}
                            onChange={e => setForm(f => ({ ...f, frequency_type: e.target.value as FrequencyType }))}
                            className="input"
                        >
                            <option value="daily">Diário</option>
                            <option value="weekly">Dias específicos</option>
                            <option value="x_per_week">X vezes por semana</option>
                        </select>
                    </div>

                    {/* Dias da semana */}
                    {form.frequency_type === 'weekly' && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Dias</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {DAY_OPTIONS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => toggleDay(value)}
                                        className={form.frequency_days.includes(value) ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {errors.frequency_days && <div style={errorStyle}>{errors.frequency_days}</div>}
                        </div>
                    )}

                    {/* Vezes por semana */}
                    {form.frequency_type === 'x_per_week' && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Vezes por semana</label>
                            <input
                                type="number"
                                min="1"
                                max="7"
                                value={form.frequency_times}
                                onChange={e => setForm(f => ({ ...f, frequency_times: Number(e.target.value) }))}
                                className="input"
                                style={{ width: 80 }}
                            />
                            {errors.frequency_times && <div style={errorStyle}>{errors.frequency_times}</div>}
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={submit} disabled={!form.name.trim() || submitting}>
                        {submitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar hábito'}
                    </button>
                </div>
            </div>
        </>
    )
}
