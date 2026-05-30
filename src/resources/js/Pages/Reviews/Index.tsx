import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { ReviewsPageProps, CheckState, ReviewContent } from '@/types/reviews'
import ReviewSection from './components/ReviewSection'

const STATE_CYCLE: Record<string, CheckState> = {
  empty: 'filled',
  filled: 'failed',
  failed: 'neutral',
  neutral: 'empty',
}

const EMPTY_CONTENT: ReviewContent = {
  funcionou_bem: [],
  pode_melhorar: [],
  aprendizados: [],
  proxima_semana: [],
}

export default function ReviewsIndex({ reviews, current }: ReviewsPageProps) {
  const [selectedId, setSelectedId] = useState<number | null>((current ?? reviews[0])?.id ?? null)
  // Deriva o review do prop fresco (mantém completion_pct atual após cada revisit do Inertia)
  const review = reviews.find(r => r.id === selectedId) ?? null
  // Cópia local otimista do conteúdo: feedback instantâneo e evita lost-update em cliques rápidos
  const [content, setContent] = useState<ReviewContent>(review?.content ?? EMPTY_CONTENT)

  useEffect(() => {
    if (review) setContent(review.content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  if (!review) {
    return (
      <AppLayout title="Revisão" eyebrow="Cadência" subtitle="Nenhuma revisão registrada.">
        <div className="card" style={{ padding: 32, textAlign: 'center', fontStyle: 'italic', color: 'var(--text-4)' }}>
          Nenhuma revisão ainda. Comece a próxima semana.
        </div>
      </AppLayout>
    )
  }

  function patchContent(next: ReviewContent) {
    setContent(next)
    router.patch(`/reviews/${review!.id}`, {
      type:         review!.type,
      period_start: review!.period_start_iso,
      period_end:   review!.period_end_iso,
      content:      next,
    }, { preserveScroll: true })
  }

  function toggleItem(section: keyof ReviewContent, index: number) {
    const list = content[section]
    const item = list[index]
    const nextState = STATE_CYCLE[item.state ?? 'empty']
    const updated = [...list]
    updated[index] = { ...item, state: nextState }
    patchContent({ ...content, [section]: updated })
  }

  function addItem(section: keyof ReviewContent) {
    const text = prompt('Item:')
    if (!text?.trim()) return
    const updated = [...content[section], { text: text.trim(), state: 'empty' as CheckState }]
    patchContent({ ...content, [section]: updated })
  }

  return (
    <AppLayout
      title="Revisão"
      eyebrow="Cadência"
      subtitle="Revisão semanal: o que aconteceu, o que aprender, o que ajustar."
      actions={
        <select
          value={review.id}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          style={{ padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 12.5 }}
        >
          {reviews.map(r => (
            <option key={r.id} value={r.id}>Semana {r.week_number} · {r.year}</option>
          ))}
        </select>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Hero */}
        <div className="card" style={{ padding: 32, background: 'linear-gradient(180deg, var(--green-wash) 0%, var(--surface) 100%)', borderColor: 'var(--green-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="kicker">CADÊNCIA · SEMANAL</div>
              <h1 className="page-title" style={{ marginTop: 6 }}>
                Semana <em>{review.week_number}</em> · {review.year}
              </h1>
              <div className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>
                {review.period_start} → {review.period_end}
              </div>
            </div>
            <div className="ring" style={{ ['--p' as string]: review.completion_pct, ['--size' as string]: '96px', ['--ring-thickness' as string]: '10px' } as React.CSSProperties}>
              <span>{review.completion_pct}%</span>
            </div>
          </div>
        </div>

        {/* Grid 2×2 de seções */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ReviewSection
            kicker="FUNCIONOU BEM"
            title="O que rendeu"
            items={content.funcionou_bem}
            onAdd={() => addItem('funcionou_bem')}
            onToggle={(i) => toggleItem('funcionou_bem', i)}
          />
          <ReviewSection
            kicker="PODE MELHORAR"
            title="Onde houve atrito"
            items={content.pode_melhorar}
            onAdd={() => addItem('pode_melhorar')}
            onToggle={(i) => toggleItem('pode_melhorar', i)}
          />
          <ReviewSection
            kicker="APRENDIZADOS"
            title="O que ficou na bagagem"
            items={content.aprendizados}
            onAdd={() => addItem('aprendizados')}
          />
          <ReviewSection
            kicker="PRÓXIMA SEMANA"
            title="O que perseguir"
            items={content.proxima_semana}
            onAdd={() => addItem('proxima_semana')}
            onToggle={(i) => toggleItem('proxima_semana', i)}
          />
        </div>

        {/* Footer: tabela de cadência (placeholder estático) */}
        <div className="card" style={{ padding: 20 }}>
          <div className="card-head" style={{ marginBottom: 12 }}>
            <div className="card-title">Outras cadências</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12.5 }}>
            {[
              { label: 'Diária',     status: 'em pausa', tag: 'tag-gold' },
              { label: 'Mensal',     status: 'próxima',  tag: 'tag-sky'  },
              { label: 'Trimestral', status: 'aberto',   tag: 'tag-green' },
              { label: 'Anual',      status: '—',        tag: 'tag' },
            ].map((row, i) => (
              <div key={i} style={{ paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
                <div className="kicker">{row.label.toUpperCase()}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`tag ${row.tag}`}><span className="dot" />{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
