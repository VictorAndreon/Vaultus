import { useState } from 'react'
import { User } from '@/types'
import { Icons } from '@/Components/Icons'

interface Props {
  user: User | null
  title: string
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

const BREADCRUMBS: Record<string, string> = {
  Dashboard:   'Dashboard',
  Tarefas:     'Tarefas',
  Projetos:    'Projetos',
  Hábitos:     'Hábitos',
  Diário:      'Diário',
  Finanças:    'Finanças',
  Biblioteca:  'Biblioteca',
  Notas:       'Notas',
  Contatos:    'Contatos',
  Revisão:     'Revisão',
}

export default function Topbar({ user: _user, title, theme, onToggleTheme }: Props) {
  const [search, setSearch] = useState('')
  const label = BREADCRUMBS[title] ?? title

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Vaultus</span>
        <Icons.ChevronRight size={11} />
        <b>{label}</b>
      </div>

      <div className="search">
        <Icons.Search size={14} />
        <input
          type="search"
          placeholder="Buscar em tudo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Busca global"
        />
        <kbd>⌘K</kbd>
      </div>

      <button className="icon-btn" onClick={onToggleTheme} title="Alternar tema" type="button">
        {theme === 'dark' ? <Icons.Sun size={15} /> : <Icons.Moon size={15} />}
      </button>

      <button className="icon-btn" type="button" title="Notificações" style={{ position: 'relative' }}>
        <Icons.Bell size={15} />
        <span className="dot" />
      </button>

      <button type="button" className="btn btn-primary btn-sm">
        <Icons.Plus size={13} /> Capturar
      </button>
    </header>
  )
}
