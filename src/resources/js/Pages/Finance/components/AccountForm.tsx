import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Account } from '@/types'

interface Props {
    account: Account | null
    onClose: () => void
}

export default function AccountForm({ account, onClose }: Props) {
    const [name, setName] = useState(account?.name ?? '')
    const [type, setType] = useState(account?.type ?? 'checking')
    const [balance, setBalance] = useState('')
    const [currency, setCurrency] = useState(account?.currency ?? 'BRL')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (account) {
            router.patch('/finance/accounts/' + account.id, { name, currency }, { preserveScroll: true })
        } else {
            router.post('/finance/accounts', { name, type, balance_encrypted: balance, currency }, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 28, width: '100%', maxWidth: 480, zIndex: 50 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                    {account ? 'Editar conta' : 'Nova conta'}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    {!account && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value)}
                                className="input"
                            >
                                <option value="checking">Corrente</option>
                                <option value="savings">Poupança</option>
                                <option value="investment">Investimento</option>
                                <option value="cash">Dinheiro</option>
                            </select>
                        </div>
                    )}

                    {!account && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Saldo inicial</label>
                            <input
                                type="number"
                                step="0.01"
                                value={balance}
                                onChange={e => setBalance(e.target.value)}
                                className="input"
                            />
                        </div>
                    )}

                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Moeda</label>
                        <input
                            type="text"
                            value={currency}
                            onChange={e => setCurrency(e.target.value.toUpperCase())}
                            maxLength={3}
                            className="input"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
