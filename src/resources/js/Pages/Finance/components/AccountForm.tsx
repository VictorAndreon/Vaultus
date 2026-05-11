import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Account } from '@/types'
import Button from '@/Components/ui/Button'

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
        <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center">
            <div className="fixed bg-slate-900 border border-slate-800 z-50 w-full max-w-sm mx-auto top-1/3 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    {account ? 'Editar conta' : 'Nova conta'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {!account && (
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Tipo</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                            <label className="text-xs text-slate-500 block mb-1">Saldo inicial</label>
                            <input
                                type="number"
                                step="0.01"
                                value={balance}
                                onChange={e => setBalance(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Moeda</label>
                        <input
                            type="text"
                            value={currency}
                            onChange={e => setCurrency(e.target.value.toUpperCase())}
                            maxLength={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" size="sm">Salvar</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
