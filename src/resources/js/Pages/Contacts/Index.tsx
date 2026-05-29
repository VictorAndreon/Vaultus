import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { ContactsPageProps } from '@/types/contacts'
import ContactSidebar from './components/ContactSidebar'
import ContactDetail from './components/ContactDetail'

export default function ContactsIndex({ contacts }: ContactsPageProps) {
  const [activeId, setActiveId] = useState<number | null>(contacts[0]?.id ?? null)
  const active = contacts.find(c => c.id === activeId) ?? null

  return (
    <AppLayout
      title="Contatos"
      eyebrow="Rede"
      subtitle={`${contacts.length} pessoas, com contexto.`}
      actions={
        <button className="btn btn-primary btn-sm">
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
        <ContactDetail contact={active} />
      </div>
    </AppLayout>
  )
}
