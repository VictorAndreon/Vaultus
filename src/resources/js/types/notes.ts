export interface Notebook {
  id: number
  name: string
  color: string | null
}

export interface Note {
  id: number
  notebook_id: number
  notebook_name: string
  notebook_color: string | null
  title: string
  content: string
  is_sensitive: boolean
  tags: string[]
  updated_at: string
  updated_at_relative: string
}

export interface NotesPageProps {
  notebooks: Notebook[]
  notes: Note[]
}
