import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { NotesPageProps } from '@/types/notes'
import NoteSidebar from './components/NoteSidebar'
import NoteReader from './components/NoteReader'

export default function NotesIndex({ notebooks: _nb, notes }: NotesPageProps) {
  const [activeId, setActiveId] = useState<number | null>(notes[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const active = notes.find(n => n.id === activeId) ?? null

  return (
    <AppLayout
      title="Notas"
      eyebrow="Acervo"
      subtitle={`${notes.length} notas em ${_nb.length} cadernos.`}
      actions={
        <button className="btn btn-primary btn-sm">
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
        <NoteReader note={active} />
      </div>
    </AppLayout>
  )
}
