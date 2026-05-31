import { useEffect } from 'react'
import { Icons } from '@/Components/Icons'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
}

interface Props extends ConfirmOptions {
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onConfirm, onCancel])

  const danger = variant === 'danger'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 60 }}
      onClick={onCancel}
    >
      <div
        className="card"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: '90vw', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h3 className="h-3">{title}</h3>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Fechar"><Icons.X size={13} /></button>
        </div>

        {message && (
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 13.5, lineHeight: 1.5 }}>{message}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>{cancelText}</button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            autoFocus
            onClick={onConfirm}
            style={danger ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : undefined}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
