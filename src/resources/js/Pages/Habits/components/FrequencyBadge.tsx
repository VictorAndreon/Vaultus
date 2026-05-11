import { FrequencyType } from '@/types'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

interface Props {
    frequencyType: FrequencyType
    frequencyDays?: number[] | null
    frequencyTimes?: number | null
}

export default function FrequencyBadge({ frequencyType, frequencyDays, frequencyTimes }: Props) {
    const label = () => {
        if (frequencyType === 'daily') return 'Diário'
        if (frequencyType === 'x_per_week') return `${frequencyTimes}× / semana`
        if (frequencyType === 'weekly' && frequencyDays?.length) {
            return frequencyDays.map(d => DAY_LABELS[d]).join(' · ')
        }
        return 'Semanal'
    }

    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400">
            {label()}
        </span>
    )
}
