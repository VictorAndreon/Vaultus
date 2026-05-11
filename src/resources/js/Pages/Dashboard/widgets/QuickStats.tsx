import Card from '@/Components/ui/Card'

interface Stats {
    tasks_due_today: number
    habits_done_today: number
    habits_total: number
    journal_entries_this_month: number
    open_projects: number
}

export default function QuickStats({ stats }: { stats: Stats }) {
    const items = [
        { label: 'Tarefas hoje',    value: stats.tasks_due_today,   unit: '' },
        { label: 'Hábitos',         value: `${stats.habits_done_today}/${stats.habits_total}`, unit: '' },
        { label: 'Diário (mês)',    value: stats.journal_entries_this_month, unit: 'entradas' },
        { label: 'Projetos ativos', value: stats.open_projects,     unit: '' },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(item => (
                <Card key={item.label} className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className="text-2xl font-bold text-slate-100">
                        {item.value}
                        {item.unit && <span className="text-sm text-slate-500 ml-1">{item.unit}</span>}
                    </span>
                </Card>
            ))}
        </div>
    )
}
