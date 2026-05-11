import { FrequencyType } from '@/types'

interface Props {
    currentStreak: number
    bestStreak: number
    frequencyType: FrequencyType
}

export default function StreakDisplay({ currentStreak, bestStreak, frequencyType }: Props) {
    const unit = frequencyType === 'x_per_week' ? 'semanas' : 'dias'

    return (
        <div className="flex items-center gap-4 text-sm">
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-indigo-400">{currentStreak}</span>
                <span className="text-xs text-slate-500">{unit} atual</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-400">{bestStreak}</span>
                <span className="text-xs text-slate-500">melhor</span>
            </div>
        </div>
    )
}
