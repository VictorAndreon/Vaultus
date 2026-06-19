import { JournalEntry } from '@/types'
import { parseLocalDate } from '@/lib/date'

interface Props { entries: JournalEntry[]; selectedDate: string | null; onSelectDate: (d: string) => void }

const MOOD_TAG: Record<number, { label: string; cls: string }> = {
    5: { label: 'Ótimo',   cls: 'tag-green' },
    4: { label: 'Bom',     cls: 'tag-green' },
    3: { label: 'Neutro',  cls: 'tag' },
    2: { label: 'Cansado', cls: 'tag-gold' },
    1: { label: 'Difícil', cls: 'tag-rose' },
}

export default function EntryList({ entries, selectedDate, onSelectDate }: Props) {
    if (entries.length === 0) return (
        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: 32 }}>
            Nenhuma entrada ainda. Comece escrevendo hoje.
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {entries.map(entry => {
                const d = parseLocalDate(entry.date)
                const mood = entry.mood ? MOOD_TAG[entry.mood] : null
                return (
                    <article
                        key={entry.id}
                        className="card"
                        style={{ padding: 28, cursor: 'pointer', borderColor: selectedDate === entry.date ? 'var(--green-soft)' : undefined }}
                        onClick={() => onSelectDate(entry.date)}
                    >
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div style={{ flex: 'none', textAlign: 'center', width: 64, paddingTop: 6 }}>
                                <div style={{ fontFamily: 'var(--serif)', fontSize: 42, lineHeight: 1, color: 'var(--text)' }}>{d ? d.getDate() : '—'}</div>
                                <div className="kicker" style={{ marginTop: 4 }}>
                                    {d ? d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : ''}
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    {mood && <span className={`tag ${mood.cls}`}><span className="dot" />{mood.label}</span>}
                                    {(entry.tags ?? []).slice(0, 3).map(t => (
                                        <span key={t} className="tag"><span className="dot" />{t}</span>
                                    ))}
                                </div>
                                {entry.title && (
                                    <div style={{ fontSize: 16, fontFamily: 'var(--serif)', color: 'var(--text)', marginBottom: 4 }}>{entry.title}</div>
                                )}
                                {entry.preview && (
                                    <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65, fontSize: 14.5, maxWidth: '62ch' }}>{entry.preview}</p>
                                )}
                            </div>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}
