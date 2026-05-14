import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Want } from '@/types'

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
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 28, width: '100%', maxWidth: 480, zIndex: 50 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                    {want ? 'Editar vontade' : 'Nova vontade'}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder="ex: Desenvolvimento, Leitura…"
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prioridade</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value as Want['priority'])}
                            className="input"
                        >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                        </select>
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
