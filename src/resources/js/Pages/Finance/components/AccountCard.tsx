import { router } from '@inertiajs/react'
import { Account } from '@/types'

interface Props {
    account: Account
    onEdit: (a: Account) => void
}

function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const TYPE_TAG: Record<string, string> = {
    checking: 'tag-sky',
    savings: 'tag-green',
    investment: 'tag',
    cash: 'tag',
}

const TYPE_LABEL: Record<string, string> = {
    checking: 'Corrente',
    savings: 'Poupança',
    investment: 'Investimento',
    cash: 'Dinheiro',
}

export default function AccountCard({ account, onEdit }: Props) {
    return (
        <div className="card" style={{ padding: '20px 24px', cursor: 'pointer' }} onClick={() => router.get('/finance/accounts/' + account.id)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                    <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{account.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`tag ${TYPE_TAG[account.type] ?? 'tag'}`}><span className="dot" />{TYPE_LABEL[account.type] ?? account.type}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>{account.currency}</span>
                    </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(account) }}>Editar</button>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--text)', letterSpacing: '-0.01em' }}>{fmtBRL(account.current_balance)}</div>
        </div>
    )
}
