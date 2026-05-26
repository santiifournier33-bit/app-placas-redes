'use client'

import { Phone, MessageSquare, Check } from 'lucide-react'
import { useContactStore, SOURCE_LABELS, type Contact } from '@/lib/stores/contactStore'

interface ContactsCardsProps {
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
}

// Color-hashed avatar — same name always renders the same tint so the user
// can recognise familiar contacts at a glance instead of seeing identical
// generic icons. Initials replace the User glyph for readability.
const AVATAR_PALETTE = [
  'bg-blue-500/15 text-blue-300',
  'bg-emerald-500/15 text-emerald-300',
  'bg-amber-500/15 text-amber-300',
  'bg-violet-500/15 text-violet-300',
  'bg-rose-500/15 text-rose-300',
  'bg-cyan-500/15 text-cyan-300',
  'bg-fuchsia-500/15 text-fuchsia-300',
  'bg-teal-500/15 text-teal-300',
]

function avatarFor(name: string) {
  const hash = name.split('').reduce((h, c) => c.charCodeAt(0) + h * 31, 0)
  const tint = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
  const initial = (name.trim()[0] || '?').toUpperCase()
  return { tint, initial }
}

export function ContactsCards({ contacts, onSelectContact }: ContactsCardsProps) {
  const { markContacted } = useContactStore()

  if (contacts.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-text-muted text-sm">Sin contactos</p>
      </div>
    )
  }

  return (
    <div>
      {contacts.map(contact => {
        const displayName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Sin nombre'
        const { tint, initial } = avatarFor(displayName)
        return (
          <div
            key={contact.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-overlay transition-colors"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${tint}`}>
              {initial}
            </div>

            <button
              type="button"
              className="flex-1 min-w-0 text-left cursor-pointer no-tap-target"
              onClick={() => onSelectContact(contact)}
            >
              <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {contact.source && (
                  <span className="text-xs md:text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-2 text-text-muted">
                    {SOURCE_LABELS[contact.source as keyof typeof SOURCE_LABELS] ?? contact.source}
                  </span>
                )}
                {contact.category && (
                  <span className="text-xs md:text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-muted">
                    {contact.category}
                  </span>
                )}
                {contact.circulo && (
                  <span className="text-xs md:text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-navy-600/15 text-brand-navy-500">
                    {contact.circulo}
                  </span>
                )}
                {contact.rol && (
                  <span className="text-xs md:text-[10px] text-text-muted">{contact.rol}</span>
                )}
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => markContacted(contact.id)}
                className="p-2 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                title="Marcar contactado"
                aria-label="Marcar contactado"
              >
                <Check size={18} className="text-emerald-400/70" />
              </button>
              {contact.primary_phone && (
                <>
                  <a
                    href={`tel:${contact.primary_phone}`}
                    className="p-2 hover:bg-surface-overlay-hover rounded-lg"
                    aria-label="Llamar"
                  >
                    <Phone size={18} className="text-text-muted" />
                  </a>
                  <a
                    href={`https://wa.me/${contact.primary_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener"
                    className="p-2 hover:bg-surface-overlay-hover rounded-lg"
                    aria-label="WhatsApp"
                  >
                    <MessageSquare size={18} className="text-text-muted" />
                  </a>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
