import Card from '@/Components/ui/Card'

interface Activity {
    event: string
    created_at: string
}

const EVENT_LABELS: Record<string, string> = {
    login:          'Login realizado',
    logout:         'Logout',
    login_failed:   'Tentativa de login falhou',
    '2fa_failed':   'Código 2FA inválido',
    api_login:      'Login via API',
}

export default function RecentActivity({ activities }: { activities: Activity[] }) {
    return (
        <Card title="Atividade Recente">
            {activities.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma atividade registrada.</p>
            ) : (
                <ul className="space-y-2">
                    {activities.map((a, i) => (
                        <li key={i} className="flex justify-between text-sm">
                            <span className="text-slate-400">{EVENT_LABELS[a.event] ?? a.event}</span>
                            <span className="text-slate-600 text-xs">
                                {new Date(a.created_at).toLocaleString('pt-BR')}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
