'use client'

import { useState } from 'react'
import { X, Phone, MessageSquare, Mail, Check, Copy } from 'lucide-react'
import { useContactStore, SOURCE_LABELS, type Contact } from '@/lib/stores/contactStore'
import { ContactDataTab } from './ContactDataTab'
import { ContactNotesTab } from './ContactNotesTab'
import { ContactTasksTab } from './ContactTasksTab'
import { ContactHistoryTab } from './ContactHistoryTab'

type Tab = 'data' | 'tasks' | 'notes' | 'history'

interface ContactDetailPanelProps {
  contact: Contact
  onClose: () => void
  inline?: boolean
}

export function ContactDetailPanel({ contact, onClose, inline = false }: ContactDetailPanelProps) {
  const [tab, setTab] = useState<Tab>('data')
  const { markContacted, deleteContact } = useContactStore()

  const handleDelete = async () => {
    await deleteContact(contact.id)
    onClose()
  }

  if (inline) {
    return (
      <div className="hidden lg:flex w-[420px] shrink-0 h-full bg-[#14141e] border-l border-border-subtle flex-col">
        <PanelContent contact={contact} tab={tab} setTab={setTab} onClose={onClose} markContacted={markContacted} handleDelete={handleDelete} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md h-full bg-[#14141e] border-l border-border-subtle flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <PanelContent contact={contact} tab={tab} setTab={setTab} onClose={onClose} markContacted={markContacted} handleDelete={handleDelete} />
      </div>
    </div>
  )
}

function PanelContent({ contact, tab, setTab, onClose, markContacted, handleDelete }: {
  contact: Contact
  tab: Tab
  setTab: (t: Tab) => void
  onClose: () => void
  markContacted: (id: string) => Promise<void>
  handleDelete: () => Promise<void>
}) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400">
            {(contact.first_name || '?')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-text-primary truncate">
              {contact.first_name} {contact.last_name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {contact.source && (
                <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-text-muted">
                  {SOURCE_LABELS[contact.source as keyof typeof SOURCE_LABELS] ?? contact.source}
                </span>
              )}
              {contact.circulo && (
                <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                  {contact.circulo}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-overlay-hover rounded-lg cursor-pointer">
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Contact chips — copy to clipboard */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border-subtle shrink-0">
          {contact.primary_phone && (
            <button
              onClick={() => copyToClipboard(contact.primary_phone!, 'phone')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-overlay border border-border-subtle hover:bg-surface-overlay-hover transition-colors cursor-pointer group"
            >
              <Phone size={12} className="text-text-muted" />
              <span className="text-xs text-text-secondary">{contact.primary_phone}</span>
              {copied === 'phone'
                ? <Check size={11} className="text-emerald-400" />
                : <Copy size={11} className="text-text-muted group-hover:text-text-secondary" />}
            </button>
          )}
          {contact.primary_email && (
            <button
              onClick={() => copyToClipboard(contact.primary_email!, 'email')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-overlay border border-border-subtle hover:bg-surface-overlay-hover transition-colors cursor-pointer group"
            >
              <Mail size={12} className="text-text-muted" />
              <span className="text-xs text-text-secondary truncate max-w-[180px]">{contact.primary_email}</span>
              {copied === 'email'
                ? <Check size={11} className="text-emerald-400" />
                : <Copy size={11} className="text-text-muted group-hover:text-text-secondary" />}
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border-subtle shrink-0">
          <button
            onClick={() => markContacted(contact.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 cursor-pointer"
          >
            <Check size={13} /> Contactado
          </button>
          {contact.primary_phone && (
            <>
              <a
                href={`tel:${contact.primary_phone}`}
                className="p-2 rounded-lg hover:bg-surface-overlay-hover"
              >
                <Phone size={15} className="text-text-secondary" />
              </a>
              <a
                href={`https://wa.me/${contact.primary_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener"
                className="p-2 rounded-lg hover:bg-surface-overlay-hover"
              >
                <MessageSquare size={15} className="text-text-secondary" />
              </a>
            </>
          )}
          {contact.primary_email && (
            <a
              href={`mailto:${contact.primary_email}`}
              className="p-2 rounded-lg hover:bg-surface-overlay-hover"
            >
              <Mail size={15} className="text-text-secondary" />
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2 border-b border-border-subtle shrink-0">
          {(['data', 'tasks', 'notes', 'history'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                tab === t
                  ? 'bg-surface-overlay-hover text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t === 'data' ? 'Datos' : t === 'tasks' ? 'Tareas' : t === 'notes' ? 'Notas' : 'Historial'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'data' && <ContactDataTab contact={contact} />}
          {tab === 'tasks' && <ContactTasksTab contactId={contact.id} />}
          {tab === 'notes' && <ContactNotesTab contactId={contact.id} />}
          {tab === 'history' && <ContactHistoryTab contactId={contact.id} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle shrink-0">
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
          >
            Eliminar contacto
          </button>
        </div>
    </>
  )
}
