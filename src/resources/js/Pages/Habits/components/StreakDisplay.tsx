import { FrequencyType } from '@/types'

interface Props {
    currentStreak: number
    bestStreak: number
    frequencyType: FrequencyType
}

export default function StreakDisplay({ currentStreak, bestStreak, frequencyType }: Props) {
    const unit = frequencyType === 'x_per_week' ? 'semanas' : 'dias'

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{currentStreak}</span>
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{unit} atual</span>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--line)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-3)' }}>{bestStreak}</span>
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>melhor</span>
            </div>
        </div>
    )
}
