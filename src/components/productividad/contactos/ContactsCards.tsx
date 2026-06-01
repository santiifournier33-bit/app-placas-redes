'use client'

import { type Contact } from '@/lib/stores/contactStore'
import { COLOR_CLASS, type ChipColor } from './InlineSelectChip'
import { CATEGORY_SHORT, CIRCLE_OPTIONS, CERCANIA_OPTIONS } from './options'
import { WhatsAppIcon } from './WhatsAppIcon'

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

// Look up the label+color a value carries in its option list, so the card
// chips stay visually identical to the inline editors elsewhere (single source
// of truth = options.ts). Returns null when the value isn't set.
function chipFor(
  value: string | number | null | undefined,
  options: { value: string; label: string; color?: ChipColor }[],
): { label: string; color: ChipColor } | null {
  if (value === null || value === undefined || value === '') return null
  const opt = options.find(o => o.value === String(value))
  if (!opt) return null
  return { label: opt.label, color: opt.color ?? 'zinc' }
}

// Compact relative recency ("hoy", "ayer", "hace 3d", "hace 2sem", "hace 4m").
// Kept terse on purpose: the card line is tight on mobile.
function recencyLabel(date: string | null | undefined): string | null {
  if (!date) return null
  const then = new Date(date).getTime()
  if (Number.isNaN(then)) return null
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`
  if (days < 365) return `hace ${Math.floor(days / 30)}m`
  return `hace ${Math.floor(days / 365)}a`
}

export function ContactsCards({ contacts, onSelectContact }: ContactsCardsProps) {
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

        // Identity chips — highest-value relationship metadata, max 3, ordered
        // by usefulness. Only rendered when assigned (no empty noise).
        const chips = [
          chipFor(contact.category, CATEGORY_SHORT),
          chipFor(contact.circulo, CIRCLE_OPTIONS),
          chipFor(contact.cercania, CERCANIA_OPTIONS),
        ].filter((c): c is { label: string; color: ChipColor } => c !== null)

        const recency = recencyLabel(contact.last_contact_date)
        const waNumber = contact.primary_phone?.replace(/\D/g, '')

        return (
          <div
            key={contact.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-overlay transition-colors"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${tint}`}>
              {initial}
            </div>

            <button
              type="button"
              className="flex-1 min-w-0 text-left cursor-pointer no-tap-target"
              onClick={() => onSelectContact(contact)}
            >
              <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
              {(chips.length > 0 || recency || contact.rol) && (
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  {recency && (
                    <span className="text-[11px] text-text-muted shrink-0">{recency}</span>
                  )}
                  {chips.map((chip, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${COLOR_CLASS[chip.color]}`}
                    >
                      {chip.label}
                    </span>
                  ))}
                  {chips.length === 0 && !recency && contact.rol && (
                    <span className="text-xs text-text-muted truncate">{contact.rol}</span>
                  )}
                </div>
              )}
            </button>

            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener"
                onClick={e => e.stopPropagation()}
                className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 transition-all"
                aria-label={`WhatsApp a ${displayName}`}
              >
                <WhatsAppIcon size={20} />
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
