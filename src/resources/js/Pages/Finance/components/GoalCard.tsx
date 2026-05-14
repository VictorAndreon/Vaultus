import { FinancialGoal } from '@/types'

interface Props { goal: FinancialGoal; onEdit: (g: FinancialGoal) => void; onDelete: (g: FinancialGoal) => void }

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
    const pct = Math.min(100, Math.round(goal.progress_percent))

    return (
        <div className="card">
            <div className="card-head">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div className="h-3" style={{ fontSize: 13.5 }}>{goal.name}</div>
                        {goal.category && <span className="tag"><span className="dot" />{goal.category}</span>}
                        {goal.is_completed && <span className="tag tag-green"><span className="dot" />Concluída</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Meta: {fmtBRL(goal.target_amount)}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)}>Editar</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }} onClick={() => onDelete(goal)}>Excluir</button>
                </div>
            </div>
            <div className="meter" style={{ marginTop: 12 }}><span style={{ width: `${pct}%` }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                <span className="mono">{fmtBRL(goal.current_amount)} de {fmtBRL(goal.target_amount)}</span>
                <span className="mono" style={{ color: 'var(--green)' }}>{pct}%</span>
            </div>
            {goal.deadline && (
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                    Prazo: {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
            )}
        </div>
    )
}
