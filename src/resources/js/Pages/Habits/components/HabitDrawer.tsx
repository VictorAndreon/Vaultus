import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Habit, FrequencyType } from '@/types'
import Button from '@/Components/ui/Button'

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

export default function HabitDrawer({ habit, onClose }: Props) {
    const isEditing = !!habit

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
                name:            habit.name,
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

        if (isEditing) {
            router.patch(`/habits/${habit.id}`, payload, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        } else {
            router.post('/habits', payload, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        }
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-800 z-50 flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-200">
                        {isEditing ? 'Editar hábito' : 'Novo hábito'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg">×</button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Nome *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Ex: Meditar"
                        />
                    </div>

                    {/* Ícone */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Ícone (emoji)</label>
                        <input
                            type="text"
                            value={form.icon}
                            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                            maxLength={2}
                            className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="⭐"
                        />
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Categoria</label>
                        <input
                            type="text"
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Ex: Saúde, Estudo..."
                        />
                    </div>

                    {/* Frequência */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Frequência *</label>
                        <select
                            value={form.frequency_type}
                            onChange={e => setForm(f => ({ ...f, frequency_type: e.target.value as FrequencyType }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="daily">Diário</option>
                            <option value="weekly">Dias específicos</option>
                            <option value="x_per_week">X vezes por semana</option>
                        </select>
                    </div>

                    {/* Dias da semana */}
                    {form.frequency_type === 'weekly' && (
                        <div>
                            <label className="text-xs text-slate-500 block mb-2">Dias</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {DAY_OPTIONS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => toggleDay(value)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                            form.frequency_days.includes(value)
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vezes por semana */}
                    {form.frequency_type === 'x_per_week' && (
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Vezes por semana</label>
                            <input
                                type="number"
                                min="1"
                                max="7"
                                value={form.frequency_times}
                                onChange={e => setForm(f => ({ ...f, frequency_times: Number(e.target.value) }))}
                                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-slate-800">
                    <Button onClick={submit} className="w-full" disabled={!form.name.trim()}>
                        {isEditing ? 'Salvar alterações' : 'Criar hábito'}
                    </Button>
                </div>
            </div>
        </>
    )
}
