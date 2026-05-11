import { ReactNode } from 'react'
import Sidebar from '@/Components/Sidebar'
import Topbar from '@/Components/Topbar'
import { PageProps } from '@/types'
import { usePage } from '@inertiajs/react'

interface Props {
    children: ReactNode
    title?: string
}

export default function AppLayout({ children, title }: Props) {
    const { auth } = usePage<PageProps>().props

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0">
                <Topbar user={auth.user} title={title} />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
