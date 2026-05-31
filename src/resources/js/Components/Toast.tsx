import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import { PageProps } from '@/types'

interface ToastItem {
  id: number
  type: 'success' | 'error'
  text: string
}

let seq = 0

export default function Toast() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    function push(type: 'success' | 'error', text: string) {
      const id = ++seq
      setItems((cur) => [...cur, { id, type, text }])
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3500)
    }

    // Dispara a cada visita Inertia bem-sucedida — pega flash mesmo em mensagens repetidas.
    const off = router.on('success', (event) => {
      const flash = (event.detail.page.props as unknown as PageProps).flash
      if (flash?.success) push('success', flash.success)
      if (flash?.error) push('error', flash.error)
    })

    return off
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 80, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {items.map((t) => {
        const accent = t.type === 'success' ? 'var(--success)' : 'var(--rose)'
        return (
          <div
            key={t.id}
            className="card"
            role="status"
            style={{
              minWidth: 240, maxWidth: 360, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              borderLeft: `3px solid ${accent}`, pointerEvents: 'auto',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flex: 'none' }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t.text}</span>
          </div>
        )
      })}
    </div>
  )
}
