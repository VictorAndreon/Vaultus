import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: Props) {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50'
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' }
    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        ghost:   'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
        danger:  'bg-red-600/20 hover:bg-red-600/30 text-red-400',
    }

    return (
        <button
            className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
