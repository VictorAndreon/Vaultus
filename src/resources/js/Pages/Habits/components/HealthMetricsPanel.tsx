import { HealthMetric } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props { todayMetrics: HealthMetric | null }

const MOOD_LABELS: Record<number, string> = { 1: 'Difícil', 2: 'Cansado', 3: 'Neutro', 4: 'Calmo', 5: 'Realizado' }
const ENERGY_LABELS: Record<number, string> = { 1: 'Esgotado', 2: 'Baixo', 3: 'Médio', 4: 'Alta', 5: 'Ótimo' }

function NumMetric({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
    return (
        <div>
            <div className="kicker">{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.01em' }}>{value}</div>
                {unit && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{unit}</span>}
            </div>
            {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--mono)' }}>{hint}</div>}
        </div>
    )
}

function ScaleMetric({ label, value, selected, hue }: { label: string; value: string; selected: number; hue: 'green' | 'gold' }) {
    const color = hue === 'gold' ? 'var(--gold)' : 'var(--green)'
    return (
        <div>
            <div className="kicker">{label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginTop: 4, color: 'var(--text)' }}>{value}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {[1,2,3,4,5].map(s => (
                    <div key={s} style={{ flex: 1, height: 6, borderRadius: 99, background: s <= selected ? color : 'var(--surface-3)' }} />
                ))}
            </div>
        </div>
    )
}

export default function HealthMetricsPanel({ todayMetrics }: Props) {
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="card">
            <div className="card-head">
                <div className="card-title">Métricas de Hoje · <b className="mono">{today}</b></div>
                <a className="card-link">Histórico <Icons.ChevronRight size={11} /></a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 28 }}>
                <ScaleMetric label="Humor" value={todayMetrics?.mood != null ? (MOOD_LABELS[todayMetrics.mood] ?? String(todayMetrics.mood)) : '—'} selected={todayMetrics?.mood ?? 3} hue="green" />
                <ScaleMetric label="Energia" value={todayMetrics?.energy != null ? (ENERGY_LABELS[todayMetrics.energy] ?? String(todayMetrics.energy)) : '—'} selected={todayMetrics?.energy ?? 3} hue="gold" />
                <NumMetric label="Sono" value={todayMetrics?.sleep_hours ? String(todayMetrics.sleep_hours) : '—'} unit="h" hint="meta 7,5h" />
                <NumMetric label="Água" value={todayMetrics?.water_liters ? String(todayMetrics.water_liters) : '—'} unit="L" hint="meta 2,5L" />
                <NumMetric label="Peso" value={todayMetrics?.weight_kg ? String(todayMetrics.weight_kg) : '—'} unit="kg" />
            </div>
        </div>
    )
}
