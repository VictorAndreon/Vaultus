import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
}

export default function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: Props) {
    const base = 'btn'
    const variants = {
        primary: 'btn-primary',
        ghost:   'btn-ghost',
        danger:  'btn-ghost',
    }
    const sizes = { sm: 'btn-sm', md: '' }

    const dangerStyle = variant === 'danger'
        ? { color: 'var(--rose)' } as React.CSSProperties
        : undefined

    return (
        <button
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
            style={dangerStyle}
            {...props}
        >
            {children}
        </button>
    )
}
