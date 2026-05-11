import { JournalEntry } from '@/types'

interface Props {
    entries: JournalEntry[]
    selectedDate: string | null
    onSelectDate: (date: string) => void
}

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    })
}

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }

export default function EntryList({ entries, selectedDate, onSelectDate }: Props) {
    if (entries.length === 0) {
        return (
            <p className="text-center py-8 text-sm text-slate-600">
                Nenhuma entrada ainda. Comece escrevendo hoje.
            </p>
        )
    }

    return (
        <ul className="space-y-2">
            {entries.map(entry => (
                <li key={entry.id}>
                    <button
                        onClick={() => onSelectDate(entry.date)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                            selectedDate === entry.date
                                ? 'bg-slate-800 border-indigo-500/40'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-400 capitalize">
                                {formatDate(entry.date)}
                            </span>
                            {entry.mood && (
                                <span className="text-sm">{MOOD_EMOJI[entry.mood]}</span>
                            )}
                        </div>
                        {entry.preview ? (
                            <p className="text-sm text-slate-500 line-clamp-2">{entry.preview}</p>
                        ) : (
                            <p className="text-sm text-slate-700 italic">Entrada vazia</p>
                        )}
                        {entry.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                                {entry.tags.map(tag => (
                                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </button>
                </li>
            ))}
        </ul>
    )
}
