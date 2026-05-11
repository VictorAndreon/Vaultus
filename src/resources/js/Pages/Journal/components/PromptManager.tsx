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
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-96 bg-slate-900 border border-slate-800 rounded-xl z-50 shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-200">Gerenciar Prompts</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg">×</button>
                </div>

                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {prompts.length === 0 && (
                        <p className="text-sm text-slate-600 text-center py-4">Nenhum prompt. Crie o primeiro abaixo.</p>
                    )}
                    {prompts.map((prompt, index) => (
                        <div key={prompt.id} className="flex items-start gap-2">
                            <div className="flex flex-col gap-0.5">
                                <button onClick={() => moveUp(prompt, index)} disabled={index === 0} className="text-slate-600 hover:text-slate-400 disabled:opacity-20 text-xs px-1">↑</button>
                                <button onClick={() => moveDown(prompt, index)} disabled={index === prompts.length - 1} className="text-slate-600 hover:text-slate-400 disabled:opacity-20 text-xs px-1">↓</button>
                            </div>
                            <input
                                type="text"
                                defaultValue={prompt.content}
                                onBlur={e => { if (e.target.value !== prompt.content) updateContent(prompt, e.target.value) }}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button onClick={() => deletePrompt(prompt)} className="text-slate-600 hover:text-red-400 transition-colors text-sm px-1 pt-1.5">×</button>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-800 flex gap-2">
                    <input
                        type="text"
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPrompt()}
                        placeholder="Novo prompt..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                        onClick={addPrompt}
                        disabled={!newContent.trim()}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-indigo-500 transition-colors"
                    >+</button>
                </div>
            </div>
        </>
    )
}
