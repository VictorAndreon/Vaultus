import { router } from '@inertiajs/react'
import { Account } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    account: Account
    onEdit: (a: Account) => void
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const typeBadge: Record<string, string> = {
    checking: 'bg-blue-600/20 text-blue-400',
    savings: 'bg-green-600/20 text-green-400',
    investment: 'bg-purple-600/20 text-purple-400',
    cash: 'bg-slate-700 text-slate-400',
}

const typeLabel: Record<string, string> = {
    checking: 'Corrente',
    savings: 'Poupança',
    investment: 'Investimento',
    cash: 'Dinheiro',
}

export default function AccountCard({ account, onEdit }: Props) {
    return (
        <div
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={() => router.get('/finance/accounts/' + account.id)}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-sm font-medium text-slate-200">{account.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[account.type] ?? 'bg-slate-700 text-slate-400'}`}>
                            {typeLabel[account.type] ?? account.type}
                        </span>
                        <span className="text-xs text-slate-500">{account.currency}</span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onEdit(account) }}
                >
                    Editar
                </Button>
            </div>
            <p className="text-2xl font-bold text-slate-100">{fmtBRL(account.current_balance)}</p>
        </div>
    )
}
