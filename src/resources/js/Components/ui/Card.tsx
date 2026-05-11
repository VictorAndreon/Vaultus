import { ReactNode } from 'react'

interface Props {
    title?: string
    children: ReactNode
    className?: string
}

export default function Card({ title, children, className = '' }: Props) {
    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
            {title && (
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    {title}
                </h3>
            )}
            {children}
        </div>
    )
}
