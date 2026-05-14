import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'

interface Props { module: string }

const MODULE_CONFIG: Record<string, {
    label: string; eyebrow: string; subtitle: string; icon: keyof typeof Icons
}> = {
    notes:    { label: 'Notas',    eyebrow: 'Acervo',   subtitle: 'Ideias, capturas e referência rápida.',  icon: 'Note' },
    contacts: { label: 'Contatos', eyebrow: 'Rede',     subtitle: 'Pessoas que importam, com contexto.',    icon: 'Contact' },
    reviews:  { label: 'Revisão',  eyebrow: 'Cadência', subtitle: 'Revisão semanal, mensal e trimestral.',  icon: 'Review' },
}

const DEFAULT_CONFIG = { label: 'Em breve', eyebrow: 'Sistema', subtitle: 'Módulo em construção.', icon: 'Star' as keyof typeof Icons }

export default function Stub({ module }: Props) {
    const config = MODULE_CONFIG[module] ?? DEFAULT_CONFIG
    const Icon   = Icons[config.icon]

    return (
        <AppLayout
            title={config.label}
            eyebrow={config.eyebrow}
            subtitle={config.subtitle}
        >
            <div className="card" style={{ padding: '56px 32px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--green-soft)', color: 'var(--green-bright)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                    <Icon size={24} />
                </div>
                <h2 className="h-2" style={{ marginBottom: 10 }}>{config.label}</h2>
                <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6, maxWidth: '36ch', margin: '0 auto 24px' }}>
                    Este módulo está em desenvolvimento e estará disponível em breve.
                </p>
                <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.5 }}>
                    Receber aviso quando disponível
                </button>
            </div>
        </AppLayout>
    )
}
