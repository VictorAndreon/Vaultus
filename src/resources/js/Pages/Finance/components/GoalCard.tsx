import { FinancialGoal } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    goal: FinancialGoal
    onEdit: (g: FinancialGoal) => void
    onDelete: (g: FinancialGoal) => void
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
    const percent = Math.min(goal.progress_percent, 100)

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200">{goal.name}</p>
                    {goal.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                            {goal.category}
                        </span>
                    )}
                    {goal.is_completed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 font-medium">
                            Concluída
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(goal) }}>Editar</Button>
                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(goal) }}>Excluir</Button>
                </div>
            </div>

            <p className="text-xs text-slate-500 mb-3">Meta: {fmtBRL(goal.target_amount)}</p>

            <div className="h-2 bg-slate-800 rounded-full mb-2">
                <div
                    className="h-2 bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                />
            </div>

            <p className="text-xs text-slate-400">
                {fmtBRL(goal.current_amount)} de {fmtBRL(goal.target_amount)} ({Math.round(goal.progress_percent)}%)
            </p>

            {goal.deadline && (
                <p className="text-xs text-slate-500 mt-1">Prazo: {fmtDate(goal.deadline)}</p>
            )}
        </div>
    )
}
