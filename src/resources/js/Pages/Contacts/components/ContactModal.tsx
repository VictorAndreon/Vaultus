import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Contact, CATEGORIES } from '@/types/contacts'
import { Icons } from '@/Components/Icons'

interface Props {
  contact: Contact | null
  onClose: () => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isoFromBR(brDate: string | null): string {
  if (!brDate) return ''
  const [d, m, y] = brDate.split('/')
  if (!d || !m || !y) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export default function ContactModal({ contact, onClose }: Props) {
  const [name, setName] = useState(contact?.name ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [birthday, setBirthday] = useState(isoFromBR(contact?.birthday ?? null))
  const [context, setContext] = useState(contact?.context ?? CATEGORIES[0])
  const [nextStep, setNextStep] = useState(contact?.next_step ?? '')
  const [lastContacted, setLastContacted] = useState(isoFromBR(contact?.last_contacted_at ?? null))
  const [remindDays, setRemindDays] = useState<string>(contact?.remind_after_days?.toString() ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')

  useEffect(() => {
    setName(contact?.name ?? '')
    setEmail(contact?.email ?? '')
    setPhone(contact?.phone ?? '')
    setBirthday(isoFromBR(contact?.birthday ?? null))
    setContext(contact?.context ?? CATEGORIES[0])
    setNextStep(contact?.next_step ?? '')
    setLastContacted(isoFromBR(contact?.last_contacted_at ?? null))
    setRemindDays(contact?.remind_after_days?.toString() ?? '')
    setNotes(contact?.notes ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      birthday: birthday || null,
      context,
      next_step: nextStep || null,
      last_contacted_at: lastContacted || null,
      remind_after_days: remindDays ? Number(remindDays) : null,
      notes: notes || null,
    }
    if (contact) {
      router.patch(`/contacts/${contact.id}`, payload, { preserveScroll: true, onSuccess: onClose })
    } else {
      router.post('/contacts', payload, { preserveScroll: true, onSuccess: onClose })
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
    border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 560, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h-3">{contact ? 'Editar contato' : 'Novo contato'}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icons.X size={13} /></button>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Nome</div>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Email</div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Telefone</div>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Categoria</div>
            <select value={context} onChange={(e) => setContext(e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Aniversário</div>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} max={todayIso()} style={inputStyle} />
          </label>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Próximo passo</div>
          <input type="text" value={nextStep} onChange={(e) => setNextStep(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Último contato</div>
            <input type="date" value={lastContacted} onChange={(e) => setLastContacted(e.target.value)} max={todayIso()} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Lembrar a cada (dias)</div>
            <input type="number" min={1} max={365} value={remindDays} onChange={(e) => setRemindDays(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Notas</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            style={{ ...inputStyle, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm">{contact ? 'Salvar' : 'Criar'}</button>
        </div>
      </form>
    </div>
  )
}
