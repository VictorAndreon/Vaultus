import { useEffect, useState } from 'react'
import { Icons } from '@/Components/Icons'

export interface PromptOptions {
  title: string
  label?: string
  placeholder?: string
  initial?: string
  confirmText?: string
  cancelText?: string
}

interface Props extends PromptOptions {
  onConfirm: (value: string) => void
  onCancel: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
  border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
}

export default function InputDialog({
  title,
  label,
  placeholder,
  initial = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initial)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm(value)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 60 }}
      onClick={onCancel}
    >
      <form
        className="card"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: '90vw', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h3 className="h-3">{title}</h3>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Fechar"><Icons.X size={13} /></button>
        </div>

        <label>
          {label && <div className="kicker" style={{ marginBottom: 4 }}>{label}</div>}
          <input
            type="text"
            autoFocus
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>{cancelText}</button>
          <button type="submit" className="btn btn-primary btn-sm">{confirmText}</button>
        </div>
      </form>
    </div>
  )
}
