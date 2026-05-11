import AppLayout from '@/Layouts/AppLayout'
import QuickStats from './widgets/QuickStats'
import RecentActivity from './widgets/RecentActivity'
import TodayHabits from './widgets/TodayHabits'

interface HabitSummary {
    id: number
    name: string
    icon: string | null
    checked_in_today: boolean
}

interface Props {
    stats: {
        tasks_due_today: number
        habits_done_today: number
        habits_total: number
        journal_entries_this_month: number
        open_projects: number
        net_worth: number
    }
    recent_activity: Array<{ event: string; created_at: string }>
    habits_today: HabitSummary[]
}

export default function Dashboard({ stats, recent_activity, habits_today }: Props) {
    return (
        <AppLayout title="Dashboard">
            <div className="space-y-6 max-w-6xl">
                <QuickStats stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RecentActivity activities={recent_activity} />
                    <TodayHabits
                        habits_today={habits_today}
                        done={stats.habits_done_today}
                        total={stats.habits_total}
                    />
                </div>
            </div>
        </AppLayout>
    )
}
