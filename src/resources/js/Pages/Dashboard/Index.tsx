import AppLayout from '@/Layouts/AppLayout'
import QuickStats from './widgets/QuickStats'
import RecentActivity from './widgets/RecentActivity'
import Card from '@/Components/ui/Card'

interface Props {
    stats: {
        tasks_due_today: number
        habits_done_today: number
        habits_total: number
        journal_streak: number
        open_projects: number
    }
    recent_activity: Array<{ event: string; created_at: string }>
}

export default function Dashboard({ stats, recent_activity }: Props) {
    return (
        <AppLayout title="Dashboard">
            <div className="space-y-6 max-w-6xl">
                <QuickStats stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RecentActivity activities={recent_activity} />

                    <Card title="Módulos">
                        <p className="text-sm text-slate-600">
                            Os widgets dos módulos aparecerão aqui conforme forem implementados.
                        </p>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
