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
    const [title, setTitle] = useState(entry?.title ?? '')
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
        setTitle(entry?.title ?? '')
    }, [entry?.id, selectedDate])

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    const save = (content: string) => {
        setStatus('saving')
        if (entry?.id) {
            router.patch(`/journal/${entry.id}`, { title, content }, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            })
        } else {
            router.post('/journal', { date: selectedDate, title, content }, {
                preserveScroll: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            })
        }
    }

    const hasMoodOrEnergy = (entry?.mood ?? null) !== null || (entry?.energy ?? null) !== null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onBack} className="card-link">← Voltar</button>
                <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
                    {status === 'saving' && 'Salvando…'}
                    {status === 'saved' && 'Salvo'}
                </span>
            </div>

            {hasMoodOrEnergy && (
                <div style={{ display: 'flex', gap: 12, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-2)', border: '1px solid var(--line-soft)', fontSize: 12, color: 'var(--text-3)' }}>
                    {entry?.mood && <span>Humor: {MOOD_EMOJI[entry.mood]}</span>}
                    {entry?.energy && <span>Energia: {ENERGY_EMOJI[entry.energy]} registrados neste dia</span>}
                </div>
            )}

            <input
                type="text"
                placeholder="Título da entrada (opcional)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)',
                    marginBottom: 12, paddingBottom: 12,
                    borderBottom: '1px solid var(--line-soft)',
                }}
            />

            {editor && (
                <div className="card" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                            className={active ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <div className="card" style={{ padding: 20 }}>
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}
