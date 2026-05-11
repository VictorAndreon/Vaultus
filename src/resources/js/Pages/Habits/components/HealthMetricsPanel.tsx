import { useState } from 'react'
import { router } from '@inertiajs/react'
import { HealthMetric } from '@/types'
import Card from '@/Components/ui/Card'
import Button from '@/Components/ui/Button'

interface Props {
    todayMetrics: HealthMetric | null
}

const MOOD_LABELS = ['', '😞', '😕', '😐', '🙂', '😊']
const ENERGY_LABELS = ['', '🪫', '😴', '⚡', '🔋', '🚀']

export default function HealthMetricsPanel({ todayMetrics }: Props) {
    const [open, setOpen] = useState(!todayMetrics)
    const [form, setForm] = useState({
        mood:         todayMetrics?.mood         ?? 3,
        energy:       todayMetrics?.energy       ?? 3,
        sleep_hours:  todayMetrics?.sleep_hours  ?? '',
        water_liters: todayMetrics?.water_liters ?? '',
        weight_kg:    todayMetrics?.weight_kg    ?? '',
        notes:        todayMetrics?.notes        ?? '',
    })

    const save = () => {
        router.post('/habits/health-metrics', form, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        })
    }

    return (
        <Card>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between text-left"
            >
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Métricas do Dia
                </span>
                <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="mt-4 space-y-4">
                    {/* Humor */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Humor</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setForm(f => ({ ...f, mood: v }))}
                                    className={`text-xl p-1 rounded transition-opacity ${
                                        form.mood === v ? 'opacity-100' : 'opacity-30'
                                    }`}
                                >
                                    {MOOD_LABELS[v]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Energia */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Energia</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setForm(f => ({ ...f, energy: v }))}
                                    className={`text-xl p-1 rounded transition-opacity ${
                                        form.energy === v ? 'opacity-100' : 'opacity-30'
                                    }`}
                                >
                                    {ENERGY_LABELS[v]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campos numéricos */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { key: 'sleep_hours',  label: 'Sono (h)',  step: '0.5' },
                            { key: 'water_liters', label: 'Água (L)',  step: '0.1' },
                            { key: 'weight_kg',    label: 'Peso (kg)', step: '0.1' },
                        ].map(({ key, label, step }) => (
                            <div key={key}>
                                <label className="text-xs text-slate-500 block mb-1">{label}</label>
                                <input
                                    type="number"
                                    step={step}
                                    min="0"
                                    value={(form as any)[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="—"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Notas</label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                            placeholder="Como foi o dia..."
                        />
                    </div>

                    <Button onClick={save} size="sm">Salvar métricas</Button>
                </div>
            )}
        </Card>
    )
}
