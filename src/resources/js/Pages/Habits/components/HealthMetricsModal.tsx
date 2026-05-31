import { useState } from 'react'
import { router } from '@inertiajs/react'
import { HealthMetric } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props {
  todayMetrics: HealthMetric | null
  onClose: () => void
}

const MOOD_LABELS = ['Difícil', 'Cansado', 'Neutro', 'Calmo', 'Realizado']
const ENERGY_LABELS = ['Esgotado', 'Baixo', 'Médio', 'Alta', 'Ótimo']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
  border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
}

function Scale({ label, value, labels, hue, onChange }: {
  label: string; value: number | null; labels: string[]; hue: string; onChange: (v: number | null) => void
}) {
  return (
    <div>
      <div className="kicker" style={{ marginBottom: 6 }}>{label}{value ? ` · ${labels[value - 1]}` : ''}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(value === s ? null : s)}
            aria-pressed={value === s}
            style={{
              flex: 1, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 12,
              fontFamily: 'var(--mono)',
              border: `1px solid ${value === s ? hue : 'var(--line)'}`,
              background: value === s ? hue : 'var(--surface-2)',
              color: value === s ? 'oklch(18% 0.02 var(--h))' : 'var(--text-3)',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function HealthMetricsModal({ todayMetrics, onClose }: Props) {
  const [mood, setMood] = useState<number | null>(todayMetrics?.mood ?? null)
  const [energy, setEnergy] = useState<number | null>(todayMetrics?.energy ?? null)
  const [sleepHours, setSleepHours] = useState(todayMetrics?.sleep_hours ?? '')
  const [waterLiters, setWaterLiters] = useState(todayMetrics?.water_liters ?? '')
  const [weightKg, setWeightKg] = useState(todayMetrics?.weight_kg ?? '')
  const [notes, setNotes] = useState(todayMetrics?.notes ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post('/habits/health-metrics', {
      mood,
      energy,
      sleep_hours: sleepHours !== '' ? Number(sleepHours) : null,
      water_liters: waterLiters !== '' ? Number(waterLiters) : null,
      weight_kg: weightKg !== '' ? Number(weightKg) : null,
      notes: notes || null,
    }, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 480, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h-3">Registrar métricas de hoje</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icons.X size={13} /></button>
        </div>

        <Scale label="Humor" value={mood} labels={MOOD_LABELS} hue="var(--green)" onChange={setMood} />
        <Scale label="Energia" value={energy} labels={ENERGY_LABELS} hue="var(--gold)" onChange={setEnergy} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Sono (h)</div>
            <input type="number" step="0.5" min={0} max={24} value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Água (L)</div>
            <input type="number" step="0.1" min={0} max={20} value={waterLiters} onChange={(e) => setWaterLiters(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Peso (kg)</div>
            <input type="number" step="0.1" min={0} max={500} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Notas</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
        </div>
      </form>
    </div>
  )
}
