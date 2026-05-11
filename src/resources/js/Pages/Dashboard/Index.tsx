import { PageProps } from '@/types'

export default function Dashboard({ auth }: PageProps) {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Olá, {auth.user?.name}</h1>
            <p style={{ color: '#94a3b8', marginTop: 8 }}>Vaultus está no ar. Módulos chegando em breve.</p>
        </div>
    )
}
