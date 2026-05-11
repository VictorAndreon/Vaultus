import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import { JournalEntry } from '@/types'

interface Props {
    entry: JournalEntry | null
    selectedDate: string
    onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }
const ENERGY_EMOJI: Record<number, string> = { 1: '🪫', 2: '😴', 3: '⚡', 4: '🔋', 5: '🚀' }

export default function EntryEditor({ entry, selectedDate, onBack }: Props) {
    const [status, setStatus] = useState<SaveStatus>('idle')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: false }),
            Heading.configure({ levels: [2, 3] }),
        ],
        content: entry?.content ?? '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] px-1',
            },
        },
        onUpdate: ({ editor }) => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
                save(editor.getHTML())
            }, 800)
        },
    })

    useEffect(() => {
        if (!editor) return
        const newContent = entry?.content ?? ''
        if (editor.getHTML() !== newContent) {
            editor.commands.setContent(newContent, false)
        }
    }, [entry?.id, selectedDate])

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    const save = (content: string) => {
        setStatus('saving')
        if (entry?.id) {
            router.patch(`/journal/${entry.id}`, { content }, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            })
        } else {
            router.post('/journal', { date: selectedDate, content }, {
                preserveScroll: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            })
        }
    }

    const hasMoodOrEnergy = (entry?.mood ?? null) !== null || (entry?.energy ?? null) !== null

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1">
                    ← Voltar
                </button>
                <span className="text-xs text-slate-600">
                    {status === 'saving' && 'Salvando…'}
                    {status === 'saved' && 'Salvo'}
                </span>
            </div>

            {hasMoodOrEnergy && (
                <div className="flex gap-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
                    {entry?.mood && <span>Humor: {MOOD_EMOJI[entry.mood]}</span>}
                    {entry?.energy && <span>Energia: {ENERGY_EMOJI[entry.energy]} registrados neste dia</span>}
                </div>
            )}

            {editor && (
                <div className="flex items-center gap-1 flex-wrap border border-slate-800 rounded-lg px-2 py-1.5 bg-slate-900">
                    {[
                        { label: 'B',        action: () => editor.chain().focus().toggleBold().run(),                  active: editor.isActive('bold') },
                        { label: 'I',        action: () => editor.chain().focus().toggleItalic().run(),                active: editor.isActive('italic') },
                        { label: 'H2',       action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),   active: editor.isActive('heading', { level: 2 }) },
                        { label: 'H3',       action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),   active: editor.isActive('heading', { level: 3 }) },
                        { label: '• Lista',  action: () => editor.chain().focus().toggleBulletList().run(),             active: editor.isActive('bulletList') },
                        { label: '1. Lista', action: () => editor.chain().focus().toggleOrderedList().run(),            active: editor.isActive('orderedList') },
                    ].map(({ label, action, active }) => (
                        <button
                            key={label}
                            onClick={action}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                active
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}
