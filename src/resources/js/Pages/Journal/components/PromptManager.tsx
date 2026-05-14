import { useState } from 'react'
import { router } from '@inertiajs/react'
import { JournalPrompt } from '@/types'

interface Props {
    prompts: JournalPrompt[]
    onClose: () => void
}

export default function PromptManager({ prompts, onClose }: Props) {
    const [newContent, setNewContent] = useState('')

    const addPrompt = () => {
        if (!newContent.trim()) return
        router.post('/journal/prompts', { content: newContent }, {
            preserveScroll: true,
            onSuccess: () => setNewContent(''),
        })
    }

    const updateContent = (prompt: JournalPrompt, content: string) => {
        router.patch(`/journal/prompts/${prompt.id}`, { content }, { preserveScroll: true })
    }

    const moveUp = (prompt: JournalPrompt, index: number) => {
        if (index === 0) return
        router.patch(`/journal/prompts/${prompt.id}`, { position: prompt.position - 1 }, { preserveScroll: true })
    }

    const moveDown = (prompt: JournalPrompt, index: number) => {
        if (index === prompts.length - 1) return
        router.patch(`/journal/prompts/${prompt.id}`, { position: prompt.position + 1 }, { preserveScroll: true })
    }

    const deletePrompt = (prompt: JournalPrompt) => {
        router.delete(`/journal/prompts/${prompt.id}`, { preserveScroll: true })
    }

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 60%)', zIndex: 40 }} onClick={onClose} />
            <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 384, maxHeight: '80vh', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>Gerenciar Prompts</span>
                    <button onClick={onClose} className="btn btn-ghost btn-sm">×</button>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
                    {prompts.length === 0 && (
                        <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', padding: '16px 0' }}>Nenhum prompt. Crie o primeiro abaixo.</p>
                    )}
                    {prompts.map((prompt, index) => (
                        <div key={prompt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <button onClick={() => moveUp(prompt, index)} disabled={index === 0} className="btn btn-ghost btn-sm">↑</button>
                                <button onClick={() => moveDown(prompt, index)} disabled={index === prompts.length - 1} className="btn btn-ghost btn-sm">↓</button>
                            </div>
                            <input
                                type="text"
                                defaultValue={prompt.content}
                                onBlur={e => { if (e.target.value !== prompt.content) updateContent(prompt, e.target.value) }}
                                className="input"
                                style={{ flex: 1 }}
                            />
                            <button onClick={() => deletePrompt(prompt)} className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }}>×</button>
                        </div>
                    ))}
                </div>

                <div style={{ padding: 16, borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
                    <input
                        type="text"
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPrompt()}
                        placeholder="Novo prompt..."
                        className="input"
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={addPrompt} disabled={!newContent.trim()}>+</button>
                </div>
            </div>
        </>
    )
}
