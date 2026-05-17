'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Trash2, Phone, Mail, MessageSquare, Check, Copy,
} from 'lucide-react'
import {
  useContactStore,
  SOURCE_LABELS,
  type Contact,
} from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { ContactDataTab } from '@/components/productividad/contactos/ContactDataTab'
import { ContactNotesTab } from '@/components/productividad/contactos/ContactNotesTab'
import { ContactTasksTab } from '@/components/productividad/contactos/ContactTasksTab'
import { ContactHistoryTab } from '@/components/productividad/contactos/ContactHistoryTab'

type Tab = 'data' | 'tasks' | 'notes' | 'history'

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const contactId = params.id

  const { contacts, init, deleteContact, markContacted } = useContactStore()
  const pipelinesStore = usePipelinesStore()
  const [tab, setTab] = useState<Tab>('data')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    init()
    pipelinesStore.init()
  }, [])

  const contact: Contact | undefined = contacts.find(c => c.id === contactId)

  if (!contact) {
    return (
      <div className="p-8 text-center text-zinc-500 text-sm">
        Contacto no encontrado.
        <div className="mt-4">
          <button
            onClick={() => router.push('/productividad/contactos')}
            className="text-blue-400 hover:underline cursor-pointer"
          >
            Volver a la lista
          </button>
        </div>
      </div>
    )
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este contacto?')) return
    await deleteContact(contact.id)
    router.push('/productividad/contactos')
  }

  const fullName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header (matches TabNav height) */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-white/[0.06] shrink-0">
        <button
          onClick={() => router.push('/productividad/contactos')}
          className="p-2 rounded-xl hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 cursor-pointer"
          title="Volver a contactos"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
          {(contact.first_name || '?')[0]?.toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0 flex-1 leading-tight">
          <h1 className="text-sm font-bold text-shell-text truncate">{fullName || 'Contacto'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {contact.source && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {SOURCE_LABELS[contact.source as keyof typeof SOURCE_LABELS] ?? contact.source}
              </span>
            )}
            {contact.circulo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                {contact.circulo}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => markContacted(contact.id)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 cursor-pointer"
        >
          <Check size={13} /> Contactado
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-400 cursor-pointer"
          title="Eliminar contacto"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Contact chips bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        {contact.primary_phone && (
          <>
            <button
              onClick={() => copyToClipboard(contact.primary_phone!, 'phone')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] cursor-pointer group"
            >
              <Phone size={12} className="text-zinc-500" />
              <span className="text-xs text-zinc-300">{contact.primary_phone}</span>
              {copied === 'phone'
                ? <Check size={11} className="text-emerald-400" />
                : <Copy size={11} className="text-zinc-600 group-hover:text-zinc-400" />}
            </button>
            <a
              href={`https://wa.me/${contact.primary_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener"
              className="p-1.5 rounded-lg hover:bg-white/[0.06]"
              title="WhatsApp"
            >
              <MessageSquare size={14} className="text-zinc-400" />
            </a>
          </>
        )}
        {contact.primary_email && (
          <>
            <button
              onClick={() => copyToClipboard(contact.primary_email!, 'email')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] cursor-pointer group"
            >
              <Mail size={12} className="text-zinc-500" />
              <span className="text-xs text-zinc-300 truncate max-w-[220px]">{contact.primary_email}</span>
              {copied === 'email'
                ? <Check size={11} className="text-emerald-400" />
                : <Copy size={11} className="text-zinc-600 group-hover:text-zinc-400" />}
            </button>
            <a
              href={`mailto:${contact.primary_email}`}
              className="p-1.5 rounded-lg hover:bg-white/[0.06]"
              title="Email"
            >
              <Mail size={14} className="text-zinc-400" />
            </a>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/[0.06] shrink-0">
        {(['data', 'tasks', 'notes', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              tab === t ? 'bg-white/[0.08] text-shell-text' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'data' ? 'Datos' : t === 'tasks' ? 'Tareas' : t === 'notes' ? 'Notas' : 'Historial'}
          </button>
        ))}
      </div>

      {/* Body — full width grid: data on left, tasks/notes on right when on data tab */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'data' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-0 xl:divide-x xl:divide-white/[0.06] min-h-full">
            <div className="xl:col-span-2 p-2">
              <ContactDataTab contact={contact} />
            </div>
            <div className="xl:col-span-1 p-4 hidden xl:block">
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">
                Actividad reciente
              </h3>
              <ContactHistoryTab contactId={contact.id} />
            </div>
          </div>
        )}
        {tab === 'tasks' && <div className="max-w-3xl mx-auto"><ContactTasksTab contactId={contact.id} /></div>}
        {tab === 'notes' && <div className="max-w-3xl mx-auto"><ContactNotesTab contactId={contact.id} /></div>}
        {tab === 'history' && <div className="max-w-3xl mx-auto"><ContactHistoryTab contactId={contact.id} /></div>}
      </div>
    </div>
  )
}
