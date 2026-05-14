import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { JournalEntry, JournalPrompt } from '@/types'
import JournalCalendar from './components/JournalCalendar'
import EntryList from './components/EntryList'
import EntryEditor from './components/EntryEditor'
import PromptsPanel from './components/PromptsPanel'

interface Props {
    entries: JournalEntry[]
    prompts: JournalPrompt[]
    today: string
    mood_chart: { label: string; value: number }[]
}

const MOOD_LABELS: Record<number, string> = { 1: 'Difícil', 2: 'Cansado', 3: 'Neutro', 4: 'Calmo', 5: 'Realizado' }

function MoodChart({ data }: { data: { label: string; value: number }[] }) {
    if (data.length < 2) return null
    const values = data.map(d => d.value)
    const w = 400, h = 60, pad = 8
    const min = 1, range = 4
    const pts = values.map((v, i) => [
        pad + (i / (values.length - 1)) * (w - pad * 2),
        h - pad - ((v - min) / range) * (h - pad * 2),
    ] as [number, number])
    const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
            <path d={linePath} fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export default function JournalIndex({ entries, prompts, today, mood_chart }: Props) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const currentEntry = selectedDate ? entries.find(e => e.date === selectedDate) ?? null : null

    const avgMood = mood_chart.length > 0
        ? Math.round(mood_chart.reduce((s, m) => s + m.value, 0) / mood_chart.length)
        : null

    return (
        <AppLayout
            title="Diário"
            eyebrow="Reflexão"
            subtitle={`Pensamentos, eventos e gratidão. ${entries.length} entradas.`}
            actions={
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedDate(today)}>
                    <Icons.Edit size={13} /> Escrever hoje
                </button>
            }
        >
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
                {/* ASIDE — sempre visível */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <JournalCalendar entries={entries} today={today} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

                    {/* Tags frequentes */}
                    <div className="card">
                        <div className="card-head"><div className="card-title">Etiquetas frequentes</div></div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {Array.from(new Set(entries.flatMap(e => e.tags ?? []))).slice(0, 8).map(tag => (
                                <span key={tag} className="tag"><span className="dot" />{tag}</span>
                            ))}
                            {entries.length === 0 && <span style={{ color: 'var(--text-4)', fontSize: 12, fontStyle: 'italic' }}>Nenhuma etiqueta ainda.</span>}
                        </div>
                    </div>

                    {/* Card Humor 30 dias */}
                    {mood_chart.length > 0 && (
                        <div className="card">
                            <div className="card-head">
                                <div className="card-title">Humor · <b>30 dias</b></div>
                            </div>
                            <MoodChart data={mood_chart} />
                            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                                <div>
                                    <div className="kicker">Média</div>
                                    <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginTop: 2 }}>
                                        {avgMood !== null ? (MOOD_LABELS[avgMood] ?? '—') : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prompts no modo edição */}
                    {selectedDate && <PromptsPanel prompts={prompts} />}
                </aside>

                {/* SECTION CENTRAL */}
                {selectedDate ? (
                    <EntryEditor entry={currentEntry} selectedDate={selectedDate} onBack={() => setSelectedDate(null)} />
                ) : (
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {/* Card de hoje */}
                        <div className="card" style={{ padding: 28, borderColor: 'var(--green-soft)', background: 'linear-gradient(180deg, var(--green-wash) 0%, var(--surface) 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <div>
                                    <div className="kicker">Hoje · {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
                                    <h2 className="h-display" style={{ marginTop: 4 }}>
                                        {new Date(today + 'T12:00:00').getDate()}{' '}
                                        <span style={{ color: 'var(--text-3)' }}>de {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' })}</span>
                                    </h2>
                                </div>
                                <button className="btn btn-primary" onClick={() => setSelectedDate(today)}>
                                    <Icons.Edit size={13} /> Escrever entrada
                                </button>
                            </div>
                            <div style={{ marginTop: 18, fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.45, maxWidth: '62ch' }}>
                                "O que sinto que vale ser registrado de hoje?"
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                                {['Gratidão','Reflexão','Evento','Sonho','Insight'].map(t => (
                                    <span key={t} className="tag"><span className="dot" />{t}</span>
                                ))}
                            </div>
                        </div>

                        <EntryList entries={entries} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                    </section>
                )}
            </div>
        </AppLayout>
    )
}
