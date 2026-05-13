import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Want } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    want: Want | null
    onClose: () => void
}

export default function WantForm({ want, onClose }: Props) {
    const [title, setTitle]       = useState(want?.title ?? '')
    const [desc, setDesc]         = useState(want?.description ?? '')
    const [category, setCategory] = useState(want?.category ?? '')
    const [priority, setPriority] = useState<Want['priority']>(want?.priority ?? 'medium')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload = { title, description: desc || null, category: category || null, priority }
        if (want) {
            router.patch('/wants/' + want.id, payload, { preserveScroll: true })
        } else {
            router.post('/wants', payload, { preserveScroll: true })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm z-50">
                <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    {want ? 'Editar vontade' : 'Nova vontade'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Categoria</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder="ex: Desenvolvimento, Leitura…"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Prioridade</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value as Want['priority'])}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                        </select>
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
