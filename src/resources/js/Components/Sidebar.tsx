import { Link, usePage } from '@inertiajs/react'
import { PageProps } from '@/types'
import { Icons } from '@/Components/Icons'

type IconComponent = (typeof Icons)[keyof typeof Icons]
type NavItem = { id: string; label: string; href: string; Icon: IconComponent; count?: number | null }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Painel',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', Icon: Icons.Dashboard },
    ],
  },
  {
    label: 'Execução',
    items: [
      { id: 'tasks',    label: 'Tarefas',    href: '/tasks',    Icon: Icons.Task,    count: null },
      { id: 'projects', label: 'Projetos',   href: '/projects', Icon: Icons.Project, count: null },
      { id: 'habits',   label: 'Hábitos',    href: '/habits',   Icon: Icons.Habit },
    ],
  },
  {
    label: 'Reflexão',
    items: [
      { id: 'journal',  label: 'Diário',     href: '/journal',  Icon: Icons.Journal },
      { id: 'finance',  label: 'Finanças',   href: '/finance',  Icon: Icons.Finance },
    ],
  },
  {
    label: 'Acervo',
    items: [
      { id: 'library',  label: 'Biblioteca', href: '/library',  Icon: Icons.Library },
      { id: 'notes',    label: 'Notas',      href: '/notes',    Icon: Icons.Note },
      { id: 'contacts', label: 'Contatos',   href: '/contacts', Icon: Icons.Contact },
    ],
  },
  {
    label: 'Cadência',
    items: [
      { id: 'reviews',  label: 'Revisão',    href: '/reviews',  Icon: Icons.Review },
    ],
  },
]

function initials(name: string | undefined): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default function Sidebar() {
  const { url, props } = usePage<PageProps>()
  const user = props.auth.user

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-name">Vaultus</span>
        <span className="brand-dot" />
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="nav-section">
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) => {
            const active = url === item.href || url.startsWith(item.href + '/')
            return (
              <Link
                key={item.id}
                href={item.href}
                className="nav-item"
                data-active={active}
              >
                <item.Icon size={16} />
                <span>{item.label}</span>
                {item.count != null && (
                  <span className="nav-count">{item.count}</span>
                )}
              </Link>
            )
          })}
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{initials(user?.name)}</div>
          <div className="user-meta">
            <div className="user-name">{user?.name ?? 'Usuário'}</div>
            <div className="user-plan">Plano · Pessoal</div>
          </div>
          <Icons.ChevronRight size={14} className="user-meta-icon" />
        </div>
      </div>
    </aside>
  )
}
