import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { JournalEntry } from '@/types'

interface Props {
    entry: JournalEntry | null
    selectedDate: string
    onBack: () => void
    suggestions?: string[]
}

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }
const ENERGY_EMOJI: Record<number, string> = { 1: '🪫', 2: '😴', 3: '⚡', 4: '🔋', 5: '🚀' }
const COMMON_TAGS = ['Gratidão', 'Reflexão', 'Evento', 'Sonho', 'Insight']

export default function EntryEditor({ entry, selectedDate, onBack, suggestions = [] }: Props) {
    const [title, setTitle] = useState(entry?.title ?? '')
    const [tags, setTags] = useState<string[]>(entry?.tags ?? [])
    const [tagInput, setTagInput] = useState('')
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(false)

    const editor = useEditor({
        // StarterKit já inclui Bold/Italic/listas; só limitamos os níveis de heading.
        extensions: [StarterKit.configure({ heading: { levels: [2, 3] } })],
        content: entry?.content ?? '',
        immediatelyRender: false,
        editorProps: { attributes: { class: 'journal-prose' } },
        // Sem autosave: apenas marcamos como "não salvo". A persistência é explícita
        // (botão Salvar) — assim navegar/digitar nunca cria uma entrada sozinho.
        onUpdate: () => setDirty(true),
    })

    // Estados ativos da toolbar via useEditorState: re-renderiza só quando a
    // formatação sob o cursor muda, não a cada transação (evita a lentidão).
    const active = useEditorState({
        editor,
        selector: (ctx) => {
            const e = ctx.editor
            return {
                bold: e?.isActive('bold') ?? false,
                italic: e?.isActive('italic') ?? false,
                h2: e?.isActive('heading', { level: 2 }) ?? false,
                h3: e?.isActive('heading', { level: 3 }) ?? false,
                bullet: e?.isActive('bulletList') ?? false,
                ordered: e?.isActive('orderedList') ?? false,
            }
        },
    })

    // Re-sincroniza o editor ao trocar de entrada/data (inclui o caso de "criar":
    // após o POST a entrada ganha id e voltamos aqui já em modo edição).
    useEffect(() => {
        if (!editor) return
        const newContent = entry?.content ?? ''
        if (editor.getHTML() !== newContent) editor.commands.setContent(newContent, { emitUpdate: false })
        setTitle(entry?.title ?? '')
        setTags(entry?.tags ?? [])
        setTagInput('')
        setDirty(false)
        setError(false)
    }, [entry?.id, selectedDate, editor])

    const addTag = (raw: string) => {
        const t = raw.trim()
        if (!t) return
        if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) {
            setTags([...tags, t])
            setDirty(true)
        }
        setTagInput('')
    }

    const removeTag = (t: string) => {
        setTags(tags.filter(x => x !== t))
        setDirty(true)
    }

    const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag(tagInput)
        } else if (e.key === 'Backspace' && !tagInput && tags.length) {
            removeTag(tags[tags.length - 1])
        }
    }

    const isEmpty = !title.trim() && (editor?.isEmpty ?? true) && tags.length === 0
    const canSave = !!editor && dirty && !saving && !(!entry?.id && isEmpty)

    const save = () => {
        if (!editor || !canSave) return
        const payload = { title: title.trim() || null, content: editor.getHTML(), tags }
        setSaving(true)
        setError(false)
        const opts = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setDirty(false),
            onError: () => setError(true),
            onFinish: () => setSaving(false),
        }
        if (entry?.id) router.patch(`/journal/${entry.id}`, payload, opts)
        else router.post('/journal', { date: selectedDate, ...payload }, opts)
    }

    // Ctrl/Cmd+S salva sem sair do editor.
    const onKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault()
            save()
        }
    }

    const statusLabel = saving
        ? 'Salvando…'
        : error
            ? 'Erro ao salvar'
            : dirty
                ? 'Alterações não salvas'
                : entry?.id
                    ? 'Salvo'
                    : ''

    const hasMoodOrEnergy = (entry?.mood ?? null) !== null || (entry?.energy ?? null) !== null

    const suggestionList = Array.from(new Set([...suggestions, ...COMMON_TAGS]))
        .filter(t => !tags.some(x => x.toLowerCase() === t.toLowerCase()))
        .slice(0, 8)

    const toolbar: { label: string; action: () => void; active: boolean }[] = [
        { label: 'B',         action: () => editor?.chain().focus().toggleBold().run(),                active: active?.bold ?? false },
        { label: 'I',         action: () => editor?.chain().focus().toggleItalic().run(),              active: active?.italic ?? false },
        { label: 'H2',        action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: active?.h2 ?? false },
        { label: 'H3',        action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: active?.h3 ?? false },
        { label: '• Lista',   action: () => editor?.chain().focus().toggleBulletList().run(),           active: active?.bullet ?? false },
        { label: '1. Lista',  action: () => editor?.chain().focus().toggleOrderedList().run(),          active: active?.ordered ?? false },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onKeyDown={onKeyDown}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onBack} className="card-link">← Voltar</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: error ? 'var(--rose)' : 'var(--text-4)', fontFamily: 'var(--mono)' }}>
                        {statusLabel}
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={!canSave}>
                        Salvar
                    </button>
                </div>
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
                onChange={e => { setTitle(e.target.value); setDirty(true) }}
                style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)',
                    marginBottom: 4, paddingBottom: 12,
                    borderBottom: '1px solid var(--line-soft)',
                }}
            />

            {/* Tags */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                    {tags.map(t => (
                        <span key={t} className="tag tag-chip">
                            <span className="dot" />{t}
                            <button type="button" onClick={() => removeTag(t)} aria-label={`Remover ${t}`}>×</button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={onTagKeyDown}
                        onBlur={() => addTag(tagInput)}
                        placeholder={tags.length ? 'Adicionar etiqueta…' : 'Adicionar etiquetas (Enter)…'}
                        style={{
                            flex: 1, minWidth: 140, background: 'transparent', border: 'none',
                            outline: 'none', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-2)',
                        }}
                    />
                </div>
                {suggestionList.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {suggestionList.map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => addTag(t)}
                                className="tag"
                                style={{ cursor: 'pointer', opacity: 0.7 }}
                            >
                                + {t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {editor && (
                <div className="card" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {toolbar.map(({ label, action, active: isActive }) => (
                        <button
                            key={label}
                            onClick={action}
                            className={isActive ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
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
