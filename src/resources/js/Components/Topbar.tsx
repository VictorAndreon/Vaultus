import { User } from '@/types'

interface Props {
    user: User | null
    title?: string
}

export default function Topbar({ user, title }: Props) {
    return (
        <header className="h-14 shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6">
            <h1 className="text-sm font-semibold text-slate-300">
                {title ?? 'Dashboard'}
            </h1>
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-sm text-slate-400">{user?.name}</span>
            </div>
        </header>
    )
}
