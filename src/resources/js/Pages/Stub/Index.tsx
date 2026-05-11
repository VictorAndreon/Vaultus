import AppLayout from '@/Layouts/AppLayout'
import Card from '@/Components/ui/Card'

interface Props { module: string }

const LABELS: Record<string, string> = {
    tasks: 'Tarefas', projects: 'Projetos', habits: 'Hábitos',
    journal: 'Diário', finance: 'Finanças', library: 'Biblioteca',
    notes: 'Notas', contacts: 'Contatos', reviews: 'Revisões',
}

export default function Stub({ module }: Props) {
    const label = LABELS[module] ?? module
    return (
        <AppLayout title={label}>
            <Card className="max-w-md">
                <p className="text-slate-500 text-sm">
                    O módulo <span className="text-slate-300 font-medium">{label}</span> será implementado em breve.
                </p>
            </Card>
        </AppLayout>
    )
}
