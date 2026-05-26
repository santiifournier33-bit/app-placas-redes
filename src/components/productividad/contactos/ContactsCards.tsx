'use client'

import { User, Phone, MessageSquare, Check } from 'lucide-react'
import { useContactStore, SOURCE_LABELS, type Contact } from '@/lib/stores/contactStore'

interface ContactsCardsProps {
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
}

export function ContactsCards({ contacts, onSelectContact }: ContactsCardsProps) {
  const { markContacted } = useContactStore()

  if (contacts.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-zinc-600 text-sm">Sin contactos</p>
      </div>
    )
  }

  return (
    <div>
      {contacts.map(contact => (
        <div
          key={contact.id}
          className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-500/15">
            <User size={16} className="text-blue-400" />
          </div>

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onSelectContact(contact)}
          >
            <p className="text-sm font-medium text-shell-text truncate">
              {contact.first_name} {contact.last_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {contact.source && (
                <span className="text-xs md:text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  {SOURCE_LABELS[contact.source as keyof typeof SOURCE_LABELS] ?? contact.source}
                </span>
              )}
              {contact.category && (
                <span className="text-xs md:text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  {contact.category}
                </span>
              )}
              {contact.circulo && (
                <span className="text-xs md:text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                  {contact.circulo}
                </span>
              )}
              {contact.rol && (
                <span className="text-xs md:text-[10px] text-zinc-600">{contact.rol}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => markContacted(contact.id)}
              className="p-2 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
              title="Marcar contactado"
            >
              <Check size={16} className="text-emerald-400/60" />
            </button>
            {contact.primary_phone && (
              <>
                <a href={`tel:${contact.primary_phone}`} className="p-2 hover:bg-white/[0.06] rounded-lg">
                  <Phone size={16} className="text-zinc-500" />
                </a>
                <a
                  href={`https://wa.me/${contact.primary_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener"
                  className="p-2 hover:bg-white/[0.06] rounded-lg"
                >
                  <MessageSquare size={16} className="text-zinc-500" />
                </a>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
