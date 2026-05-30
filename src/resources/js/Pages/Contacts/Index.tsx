import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { ContactsPageProps, Contact } from '@/types/contacts'
import ContactSidebar from './components/ContactSidebar'
import ContactDetail from './components/ContactDetail'
import ContactModal from './components/ContactModal'

export default function ContactsIndex({ contacts }: ContactsPageProps) {
  const [activeId, setActiveId] = useState<number | null>(contacts[0]?.id ?? null)
  const [modal, setModal] = useState<{ contact: Contact | null } | null>(null)
  const active = contacts.find(c => c.id === activeId) ?? null

  function handleDelete() {
    if (!active) return
    if (!confirm(`Excluir o contato "${active.name}"?`)) return
    router.delete(`/contacts/${active.id}`, {
      preserveScroll: true,
      onSuccess: () => setActiveId(null),
    })
  }

  return (
    <AppLayout
      title="Contatos"
      eyebrow="Rede"
      subtitle={`${contacts.length} pessoas, com contexto.`}
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ contact: null })}>
          <Icons.Plus size={13} /> Novo contato
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <ContactSidebar
          contacts={contacts}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <ContactDetail
          contact={active}
          onEdit={() => active && setModal({ contact: active })}
          onDelete={handleDelete}
        />
      </div>

      {modal && (
        <ContactModal
          contact={modal.contact}
          onClose={() => setModal(null)}
        />
      )}
    </AppLayout>
  )
}
