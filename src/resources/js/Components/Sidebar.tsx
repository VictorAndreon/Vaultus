import { Link, usePage } from '@inertiajs/react'

const NAV = [
    { label: 'Dashboard',  href: '/dashboard',  icon: '⊞' },
    { label: 'Tarefas',    href: '/tasks',       icon: '☑' },
    { label: 'Projetos',   href: '/projects',    icon: '◈' },
    { label: 'Hábitos',    href: '/habits',      icon: '◎' },
    { label: 'Diário',     href: '/journal',     icon: '✎' },
    { label: 'Finanças',   href: '/finance',     icon: '◉' },
    { label: 'Biblioteca', href: '/library',     icon: '⊟' },
    { label: 'Notas',      href: '/notes',       icon: '◻' },
    { label: 'Contatos',   href: '/contacts',    icon: '◑' },
    { label: 'Revisões',   href: '/reviews',     icon: '◷' },
]

export default function Sidebar() {
    const { url } = usePage()

    return (
        <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="px-4 py-5 border-b border-slate-800">
                <span className="text-lg font-bold text-indigo-400 tracking-wide">Vaultus</span>
            </div>

            <nav className="flex-1 py-4 overflow-y-auto">
                {NAV.map(item => {
                    const active = url.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                active
                                    ? 'bg-indigo-600/20 text-indigo-300 font-medium border-r-2 border-indigo-500'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="px-4 py-3 border-t border-slate-800">
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="w-full text-left text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                    Sair
                </Link>
            </div>
        </aside>
    )
}
