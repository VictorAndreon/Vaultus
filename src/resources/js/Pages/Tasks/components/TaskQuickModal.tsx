import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'

export interface ProjectOption {
  id: number
  title: string
  columns: { id: number; name: string }[]
}

interface Props {
  projects: ProjectOption[]
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
  border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
}

export default function TaskQuickModal({ projects, onClose }: Props) {
  const [projectId, setProjectId] = useState<number>(projects[0]?.id ?? 0)
  const project = projects.find(p => p.id === projectId) ?? projects[0] ?? null
  const [columnId, setColumnId] = useState<number>(project?.columns[0]?.id ?? 0)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueAt, setDueAt] = useState('')

  function changeProject(id: number) {
    setProjectId(id)
    const next = projects.find(p => p.id === id)
    setColumnId(next?.columns[0]?.id ?? 0)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !columnId) return
    router.post(`/projects/${projectId}/tasks`, {
      title,
      project_column_id: columnId,
      priority,
      due_at: dueAt || null,
    }, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 480, maxWidth: '90vw', padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h-3">Nova tarefa</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icons.X size={13} /></button>
        </div>

        {projects.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13.5, lineHeight: 1.5 }}>
            Nenhum projeto com colunas disponível. Crie um projeto e ao menos uma coluna no quadro antes de adicionar tarefas.
          </div>
        ) : (
          <>
            <label>
              <div className="kicker" style={{ marginBottom: 4 }}>Título</div>
              <input type="text" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>
                <div className="kicker" style={{ marginBottom: 4 }}>Projeto</div>
                <select value={projectId} onChange={(e) => changeProject(Number(e.target.value))} style={inputStyle}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
              <label>
                <div className="kicker" style={{ marginBottom: 4 }}>Coluna</div>
                <select value={columnId} onChange={(e) => setColumnId(Number(e.target.value))} style={inputStyle}>
                  {(project?.columns ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>
                <div className="kicker" style={{ marginBottom: 4 }}>Prioridade</div>
                <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} style={inputStyle}>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
              <label>
                <div className="kicker" style={{ marginBottom: 4 }}>Prazo</div>
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={inputStyle} />
              </label>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={projects.length === 0 || !columnId}>Criar</button>
        </div>
      </form>
    </div>
  )
}
