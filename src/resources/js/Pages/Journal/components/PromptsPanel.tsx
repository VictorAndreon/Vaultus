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
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setManagerOpen(true)}
                        className="btn btn-ghost btn-sm"
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
            <div className="card">
                <button
                    onClick={() => setOpen(o => !o)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <span className="kicker">Prompts de escrita</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={e => { e.stopPropagation(); setManagerOpen(true) }}
                            className="btn btn-ghost btn-sm"
                        >⚙</button>
                        <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{open ? '▲' : '▼'}</span>
                    </div>
                </button>
                {open && (
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line)' }}>
                        {prompts.map(prompt => (
                            <div key={prompt.id} style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
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
