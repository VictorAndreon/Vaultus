import { useState } from 'react'
import { router } from '@inertiajs/react'
import CurrencyInput from '@/Components/CurrencyInput'
import { Account } from '@/types'

const LIABILITY_TYPES = ['credit', 'loan'] as const

interface Props {
    account: Account | null
    onClose: () => void
}

export default function AccountForm({ account, onClose }: Props) {
    const [name, setName] = useState(account?.name ?? '')
    const [type, setType] = useState(account?.type ?? 'checking')
    const [balance, setBalance] = useState<number>(0)
    const [currency, setCurrency] = useState(account?.currency ?? 'BRL')
    const [creditLimit, setCreditLimit] = useState<number>(0)
    const [interestRate, setInterestRate] = useState<number | ''>('')

    const isLiability = LIABILITY_TYPES.includes(type as any)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (account) {
            router.patch('/finance/accounts/' + account.id, { name, currency }, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            })
        } else {
            router.post('/finance/accounts', {
                name,
                type,
                balance_encrypted: balance,
                currency,
                ...(type === 'credit' && { credit_limit_encrypted: creditLimit }),
                ...(isLiability && interestRate !== '' && { interest_rate: interestRate }),
            }, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            })
        }
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
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" />
                    </div>

                    {!account && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
                            <select value={type} onChange={e => setType(e.target.value)} className="input">
                                <optgroup label="Ativos">
                                    <option value="checking">Conta corrente</option>
                                    <option value="savings">Poupança</option>
                                    <option value="investment">Investimento</option>
                                    <option value="cash">Dinheiro</option>
                                </optgroup>
                                <optgroup label="Passivos (dívidas)">
                                    <option value="credit">Cartão de crédito</option>
                                    <option value="loan">Financiamento / empréstimo</option>
                                </optgroup>
                            </select>
                            {isLiability && (
                                <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 4 }}>
                                    Este tipo é um passivo — será subtraído do seu patrimônio líquido.
                                </p>
                            )}
                        </div>
                    )}

                    {!account && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>
                                {isLiability ? 'Dívida atual (saldo devedor)' : 'Saldo inicial'}
                            </label>
                            <CurrencyInput className="input" value={balance} onValueChange={setBalance} />
                        </div>
                    )}

                    {!account && type === 'credit' && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Limite do cartão</label>
                            <CurrencyInput className="input" value={creditLimit} onValueChange={setCreditLimit} />
                        </div>
                    )}

                    {!account && isLiability && (
                        <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Taxa de juros anual (%) — opcional</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="999"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input"
                                placeholder="Ex: 12.5"
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
