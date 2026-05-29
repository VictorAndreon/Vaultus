import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { NotesPageProps, Note } from '@/types/notes'
import NoteSidebar from './components/NoteSidebar'
import NoteReader from './components/NoteReader'
import NoteEditor from './components/NoteEditor'

export default function NotesIndex({ notebooks, notes }: NotesPageProps) {
  const [activeId, setActiveId] = useState<number | null>(notes[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState<{ note: Note | null } | null>(null)
  const active = notes.find(n => n.id === activeId) ?? null

  function handleDelete() {
    if (!active) return
    if (!confirm(`Excluir a nota "${active.title}"?`)) return
    router.delete(`/notes/${active.id}`, { preserveScroll: true })
  }

  return (
    <AppLayout
      title="Notas"
      eyebrow="Acervo"
      subtitle={`${notes.length} notas em ${notebooks.length} cadernos.`}
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setEditorOpen({ note: null })}>
          <Icons.Plus size={13} /> Nova nota
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <NoteSidebar
          notes={notes}
          activeId={activeId}
          search={search}
          onSearch={setSearch}
          onSelect={setActiveId}
        />
        <NoteReader
          note={active}
          onEdit={() => active && setEditorOpen({ note: active })}
          onDelete={handleDelete}
        />
      </div>

      {editorOpen && (
        <NoteEditor
          note={editorOpen.note}
          notebooks={notebooks}
          onClose={() => setEditorOpen(null)}
        />
      )}
    </AppLayout>
  )
}
