import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import { useConfirm } from '@/Components/dialogs/DialogProvider'

type Status = 'reading' | 'done' | 'queue' | 'abandoned'

export interface EditableBook {
  id: number
  title: string
  author: string | null
  status: Status
  genre: string | null
  cover_url: string | null
  total_pages: number | null
  current_page: number | null
  progress_percent: number
  rating: number | null
  started_at: string | null
  finished_at: string | null
}

interface Props {
  item?: EditableBook | null
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
  border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
}

const errStyle: React.CSSProperties = { color: 'var(--rose)', fontSize: 11, marginTop: 4 }

export default function LibraryModal({ item, onClose }: Props) {
  const confirm = useConfirm()
  const errors = usePage().props.errors as Record<string, string> | undefined
  const isEdit = !!item

  const [title, setTitle] = useState(item?.title ?? '')
  const [author, setAuthor] = useState(item?.author ?? '')
  const [status, setStatus] = useState<Status>(item?.status ?? 'reading')
  const [genre, setGenre] = useState(item?.genre ?? '')
  const [coverUrl, setCoverUrl] = useState(item?.cover_url ?? '')
  const [totalPages, setTotalPages] = useState(item?.total_pages != null ? String(item.total_pages) : '')
  const [currentPage, setCurrentPage] = useState(item?.current_page != null ? String(item.current_page) : '')
  const [rating, setRating] = useState(item?.rating != null ? String(item.rating) : '')
  const [startedAt, setStartedAt] = useState(item?.started_at ?? '')
  const [finishedAt, setFinishedAt] = useState(item?.finished_at ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title,
      author: author || null,
      status,
      genre: genre || null,
      cover_url: coverUrl || null,
      total_pages: totalPages ? Number(totalPages) : null,
      current_page: currentPage ? Number(currentPage) : null,
      rating: status === 'done' && rating ? Number(rating) : null,
      started_at: status !== 'queue' ? (startedAt || null) : null,
      finished_at: status === 'done' ? (finishedAt || null) : null,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (isEdit) router.patch(`/library/${item!.id}`, payload, opts)
    else router.post('/library', payload, opts)
  }

  async function handleDelete() {
    if (!item) return
    if (!(await confirm({ title: `Remover "${item.title}"?`, variant: 'danger', confirmText: 'Excluir' }))) return
    router.delete(`/library/${item.id}`, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 560, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h-3">{isEdit ? 'Editar livro' : 'Adicionar livro'}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icons.X size={13} /></button>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Título</div>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          {errors?.title && <div style={errStyle}>{errors.title}</div>}
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Autor</div>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Gênero</div>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)} style={inputStyle}>
              <option value="reading">Em leitura</option>
              <option value="queue">Na fila</option>
              <option value="done">Concluído</option>
              <option value="abandoned">Abandonado</option>
            </select>
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Capa (URL)</div>
            <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
            {errors?.cover_url && <div style={errStyle}>{errors.cover_url}</div>}
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Total de páginas</div>
            <input type="number" min={1} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} style={inputStyle} />
          </label>
          {(status === 'reading' || status === 'abandoned') && (
            <label>
              <div className="kicker" style={{ marginBottom: 4 }}>Página atual</div>
              <input type="number" min={0} value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} style={inputStyle} />
              {errors?.current_page && <div style={errStyle}>{errors.current_page}</div>}
            </label>
          )}
        </div>

        {status !== 'queue' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label>
              <div className="kicker" style={{ marginBottom: 4 }}>Início</div>
              <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} style={inputStyle} />
            </label>
            {status === 'done' && (
              <label>
                <div className="kicker" style={{ marginBottom: 4 }}>Conclusão</div>
                <input type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} style={inputStyle} />
              </label>
            )}
          </div>
        )}

        {status === 'done' && (
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Avaliação (1–5)</div>
            <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} style={{ ...inputStyle, width: 120 }} />
          </label>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div>
            {isEdit && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--rose)' }}>Excluir</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">{isEdit ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
