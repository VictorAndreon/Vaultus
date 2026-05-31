import React, { ReactNode, useState, useEffect } from 'react'
import Sidebar from '@/Components/Sidebar'
import Topbar from '@/Components/Topbar'
import Toast from '@/Components/Toast'
import { DialogProvider } from '@/Components/dialogs/DialogProvider'
import { PageProps } from '@/types'
import { usePage } from '@inertiajs/react'

interface Props {
  children: ReactNode
  title?: string
  eyebrow?: string
  subtitle?: string
  actions?: ReactNode
  showHead?: boolean
  showSyncPill?: boolean
}

function renderTitle(title: string): React.ReactNode {
  if (title.startsWith('Boa noite,') || title.startsWith('Bom dia,') || title.startsWith('Boa tarde,')) {
    const parts = title.split(/(,\s+)([A-ZÀ-Ú][a-zà-ú]+)(\.?)$/)
    if (parts.length >= 4) {
      return <>{parts[0]}{parts[1]}<em>{parts[2]}</em>{parts[3]}</>
    }
  }
  return title
}

export default function AppLayout({ children, title, eyebrow, subtitle, actions, showHead = true, showSyncPill = false }: Props) {
  const { auth } = usePage<PageProps>().props

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vaultus-theme') as 'dark' | 'light') || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('vaultus-theme', theme)
  }, [theme])

  const hasHead = showHead && (title || eyebrow || subtitle || actions)

  return (
    <DialogProvider>
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar
            user={auth.user}
            title={title ?? 'Dashboard'}
            theme={theme}
            onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          />
          <div className="content">
            {hasHead && (
              <div className="page-head">
                <div className="page-head-left">
                  {eyebrow && (
                    <div className="eyebrow">
                      <span>{eyebrow}</span>
                      {showSyncPill && <span className="pill">Sincronizado · agora</span>}
                    </div>
                  )}
                  {title && <h1 className="page-title">{renderTitle(title)}</h1>}
                  {subtitle && <div className="page-subtitle">{subtitle}</div>}
                </div>
                {actions && <div className="page-actions">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
      <Toast />
    </DialogProvider>
  )
}
