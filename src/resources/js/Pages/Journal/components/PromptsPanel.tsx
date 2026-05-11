import { useState } from 'react'
import { JournalPrompt } from '@/types'
import PromptManager from './PromptManager'

interface Props {
    prompts: JournalPrompt[]
}

export default function PromptsPanel({ prompts }: Props) {
    const [open, setOpen] = useState(prompts.length > 0)
    const [managerOpen, setManagerOpen] = useState(false)

    if (prompts.length === 0) {
        return (
            <>
                <div className="flex justify-end">
                    <button
                        onClick={() => setManagerOpen(true)}
                        className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1"
                    >
                        ⚙ Adicionar prompts
                    </button>
                </div>
                {managerOpen && <PromptManager prompts={prompts} onClose={() => setManagerOpen(false)} />}
            </>
        )
    }

    return (
        <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Prompts de escrita
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); setManagerOpen(true) }}
                            className="text-slate-600 hover:text-slate-400 text-xs"
                        >⚙</button>
                        <span className="text-slate-600 text-xs">{open ? '▲' : '▼'}</span>
                    </div>
                </button>
                {open && (
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-800 pt-3">
                        {prompts.map(prompt => (
                            <div key={prompt.id} className="text-sm text-slate-400 px-3 py-2 bg-slate-800/50 rounded-lg">
                                {prompt.content}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {managerOpen && <PromptManager prompts={prompts} onClose={() => setManagerOpen(false)} />}
        </>
    )
}
