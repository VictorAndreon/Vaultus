import { Contact, CATEGORY_HUE } from '@/types/contacts'
import GradientAvatar from '@/Components/GradientAvatar'
import { Icons } from '@/Components/Icons'

interface Props {
  contact: Contact | null
  onEdit?: () => void
  onDelete?: () => void
}

export default function ContactDetail({ contact, onEdit, onDelete }: Props) {
  if (!contact) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontSize: 14 }}>
        Selecione um contato para ver detalhes.
      </div>
    )
  }

  const hue = CATEGORY_HUE[contact.context ?? ''] ?? 140
  const upcoming = contact.upcoming_birthday

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
          <GradientAvatar initials={contact.initials} size={72} hue={hue} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="h-2" style={{ marginBottom: 4 }}>{contact.name}</h2>
            {contact.context && <span className="tag tag-green"><span className="dot" />{contact.context}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {onEdit && <button className="icon-btn" onClick={onEdit} aria-label="Editar"><Icons.Edit size={13} /></button>}
            {onDelete && <button className="icon-btn" onClick={onDelete} aria-label="Deletar"><Icons.Trash size={13} /></button>}
          </div>
        </div>

        {(contact.email || contact.phone) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {contact.email && (
              <span className="tag" style={{ background: 'var(--surface-2)' }}>
                <Icons.Star size={11} /> {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="tag" style={{ background: 'var(--surface-2)' }}>
                <Icons.Smartphone size={11} /> {contact.phone}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          <div>
            <div className="kicker">Aniversário</div>
            <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>{contact.birthday ?? '—'}</div>
          </div>
          <div>
            <div className="kicker">Último contato</div>
            <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>{contact.last_contacted_relative ?? '—'}</div>
          </div>
          <div>
            <div className="kicker">Próximo passo</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{contact.next_step ?? '—'}</div>
          </div>
          <div>
            <div className="kicker">Lembrar a cada</div>
            <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>{contact.remind_after_days ? `${contact.remind_after_days} dias` : '—'}</div>
          </div>
        </div>

        {contact.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
            <div className="kicker" style={{ marginBottom: 6 }}>Notas</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{contact.notes}</div>
          </div>
        )}
      </div>

      {upcoming && upcoming.days_away <= 30 && upcoming.days_away >= 0 && (
        <div className="card accent-line" style={{ padding: 18 }}>
          <div className="kicker">PRÓXIMO · ANIVERSÁRIO</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginTop: 4 }}>
            {upcoming.days_away === 0 ? 'Hoje' : `Em ${upcoming.days_away} dia${upcoming.days_away > 1 ? 's' : ''}`}
            <span className="mono muted" style={{ fontSize: 13, marginLeft: 8 }}>· {upcoming.date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
