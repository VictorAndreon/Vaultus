import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import Sparkline from '@/Components/charts/Sparkline'
import LibraryModal, { EditableBook } from './components/LibraryModal'

interface BookReading extends EditableBook { started_label: string | null }
interface BookDone extends EditableBook { finished_label: string | null }
interface BookQueue extends EditableBook { added: string }
type BookAbandoned = EditableBook

interface Props {
    reading: BookReading[]
    done_recent: BookDone[]
    queue: BookQueue[]
    abandoned: BookAbandoned[]
    stats: { total_year: number; in_progress: number; pages_year: number; queue_count: number }
}

function Stars({ rating }: { rating: number | null }) {
    if (!rating) return null
    return (
        <div style={{ display: 'flex', gap: 1, color: 'var(--gold)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Icons.Star key={i} size={12} style={{ fill: i < rating ? 'currentColor' : 'transparent' }} />
            ))}
        </div>
    )
}

export default function LibraryIndex({ reading, done_recent, queue, abandoned, stats }: Props) {
    const [editing, setEditing] = useState<EditableBook | null | undefined>(undefined)

    return (
        <AppLayout
            title="Biblioteca"
            eyebrow="Acervo"
            subtitle={`${stats.total_year} livros · ${stats.in_progress} em curso · ${stats.queue_count} na fila.`}
            actions={
                <button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>
                    <Icons.Plus size={13} /> Adicionar livro
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div className="grid g-4">
                    {[
                        { label: 'Livros · 2026',  value: String(stats.total_year),                  sub: `meta 24 · ${Math.round(stats.total_year / 24 * 100)}%`, spark: [1,2,3,3,4,5,6,7,8,9,10,stats.total_year], accent: 'var(--green)' },
                        { label: 'Em curso',       value: String(stats.in_progress),                 sub: 'leituras ativas',                                       spark: [1,2,1,2,3,2,3,2,3,2,3,stats.in_progress], accent: 'var(--gold)' },
                        { label: 'Páginas no ano', value: stats.pages_year.toLocaleString('pt-BR'),  sub: 'páginas lidas',                                         spark: [200,400,600,800,1100,1400,1700,2000,2400,2800,3200,stats.pages_year], accent: 'var(--green)' },
                        { label: 'Na fila',        value: String(stats.queue_count),                 sub: 'prontos para ler',                                      spark: [5,6,7,6,8,7,9,8,7,8,9,stats.queue_count], accent: 'var(--sky)' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '18px 22px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
                            <div className="stat-delta flat" style={{ marginTop: 4 }}>{s.sub}</div>
                            <div className="stat-spark">
                                <Sparkline data={s.spark} accent={s.accent} area />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Em leitura */}
                <div>
                    <div className="kicker" style={{ marginBottom: 12 }}>Em leitura · {reading.length}</div>
                    {reading.length === 0 ? (
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro em leitura.</div>
                    ) : (
                        <div className="grid g-3">
                            {reading.map(b => (
                                <div key={b.id} className="card" style={{ padding: 20, cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                    <div style={{ display: 'flex', gap: 18 }}>
                                        {b.cover_url ? (
                                            <img src={b.cover_url} alt={b.title} loading="lazy" style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }} />
                                        ) : (
                                            <div className="ph" style={{ width: 80, height: 120, flex: 'none', fontSize: 0 }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 className="h-3" style={{ fontSize: 15 }}>{b.title}</h3>
                                            {b.author && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{b.author}</div>}
                                            {b.started_label && <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8 }}>iniciado · {b.started_label}</div>}
                                            {b.total_pages && (
                                                <div style={{ marginTop: 14 }}>
                                                    <div className="meter"><span style={{ width: `${b.progress_percent}%` }} /></div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                                                        <span className="mono">{b.current_page}/{b.total_pages} pg</span>
                                                        <span className="mono" style={{ color: 'var(--green)' }}>{b.progress_percent}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Concluídos + Fila */}
                <div className="grid g-12-5">
                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Concluídos · recentes</div>
                        <div className="card" style={{ padding: 0 }}>
                            {done_recent.length === 0 ? (
                                <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro concluído ainda.</div>
                            ) : (
                                done_recent.map((b, i) => (
                                    <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                        {b.cover_url ? (
                                            <img src={b.cover_url} alt={b.title} loading="lazy" style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }} />
                                        ) : (
                                            <div className="ph" style={{ width: 32, height: 46, flex: 'none', fontSize: 0 }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="h-3" style={{ fontSize: 14 }}>{b.title}</div>
                                            {b.author && <div className="muted" style={{ fontSize: 12 }}>{b.author}</div>}
                                        </div>
                                        <Stars rating={b.rating} />
                                        {b.finished_label && <div className="mono muted" style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>{b.finished_label}</div>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Fila · {stats.queue_count}</div>
                        <div className="card" style={{ padding: 0 }}>
                            {queue.length === 0 ? (
                                <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Fila vazia.</div>
                            ) : (
                                queue.map((b, i) => (
                                    <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                        <div className="mono muted-2" style={{ fontSize: 11, width: 24 }}>{(i + 1).toString().padStart(2, '0')}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13.5 }}>{b.title}</div>
                                            {b.author && <div className="muted" style={{ fontSize: 11.5 }}>{b.author}</div>}
                                        </div>
                                        <div className="mono muted" style={{ fontSize: 11 }}>{b.added}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Abandonados */}
                {abandoned.length > 0 && (
                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Abandonados · {abandoned.length}</div>
                        <div className="card" style={{ padding: 0 }}>
                            {abandoned.map((b, i) => (
                                <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13.5 }}>{b.title}</div>
                                        {b.author && <div className="muted" style={{ fontSize: 11.5 }}>{b.author}</div>}
                                    </div>
                                    {b.total_pages != null && (
                                        <div className="mono muted" style={{ fontSize: 11 }}>parou na pág {b.current_page} ({b.progress_percent}%)</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {editing !== undefined && <LibraryModal item={editing} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    )
}
