'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, MessageCircle, Check, ExternalLink, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Row {
  id: string
  contact_id: string
  contact_first_name: string
  contact_last_name: string | null
  contact_phone: string | null
  contact_email: string | null
  tokko_property_id: string
  tokko_property_reference: string | null
  property_snapshot: {
    address?: string
    price?: number | null
    currency?: string | null
    property_type?: string | null
    operation_type?: number | null
    cover_photo_url?: string | null
  }
  source: string | null
  status: string | null
  first_inquired_at: string
  last_inquired_at: string
  responded_at: string | null
}

const supabase = createClient()

export default function MisConsultasPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)

      // Query inquiries owned by user + join contact + emails/phones
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select('id, contact_id, tokko_property_id, tokko_property_reference, property_snapshot, source, status, first_inquired_at, last_inquired_at, responded_at')
        .eq('owner_id', user.id)
        .order('last_inquired_at', { ascending: false })
        .limit(200)

      if (!inquiries || inquiries.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const contactIds = [...new Set(inquiries.map((i) => i.contact_id))]
      const [{ data: contacts }, { data: phones }, { data: emails }] = await Promise.all([
        supabase.from('contacts').select('id, first_name, last_name').in('id', contactIds),
        supabase.from('contact_phones').select('contact_id, phone').in('contact_id', contactIds),
        supabase.from('contact_emails').select('contact_id, email').in('contact_id', contactIds),
      ])

      const cMap = new Map((contacts ?? []).map((c) => [c.id, c]))
      const pMap = new Map<string, string>()
      for (const p of phones ?? []) if (!pMap.has(p.contact_id)) pMap.set(p.contact_id, p.phone)
      const eMap = new Map<string, string>()
      for (const e of emails ?? []) if (!eMap.has(e.contact_id)) eMap.set(e.contact_id, e.email)

      const merged: Row[] = inquiries.map((i) => {
        const c = cMap.get(i.contact_id)
        return {
          id: i.id,
          contact_id: i.contact_id,
          contact_first_name: c?.first_name ?? 'Sin nombre',
          contact_last_name: c?.last_name ?? null,
          contact_phone: pMap.get(i.contact_id) ?? null,
          contact_email: eMap.get(i.contact_id) ?? null,
          tokko_property_id: i.tokko_property_id,
          tokko_property_reference: i.tokko_property_reference,
          property_snapshot: (i.property_snapshot ?? {}) as Row['property_snapshot'],
          source: i.source,
          status: i.status,
          first_inquired_at: i.first_inquired_at,
          last_inquired_at: i.last_inquired_at,
          responded_at: i.responded_at,
        }
      })

      setRows(merged)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${r.contact_first_name} ${r.contact_last_name ?? ''} ${r.property_snapshot.address ?? ''} ${r.tokko_property_reference ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, sourceFilter, statusFilter, search])

  const markResponded = async (id: string) => {
    await supabase
      .from('inquiries')
      .update({ status: 'responded', responded_at: new Date().toISOString() })
      .eq('id', id)
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'responded', responded_at: new Date().toISOString() } : r)),
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-white/[0.06] shrink-0">
        <Inbox size={18} className="text-blue-400" />
        <h1 className="text-sm font-bold text-shell-text">Mis consultas</h1>
        <Link
          href="/consultas"
          className="ml-auto text-xs md:text-[11px] text-blue-400 hover:underline"
        >
          ← Volver al matching
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-1.5 border border-white/[0.06] flex-1 max-w-xs">
          <Search size={14} className="text-zinc-600 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 bg-transparent text-sm text-shell-text placeholder:text-zinc-700 outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-400 cursor-pointer outline-none [color-scheme:dark]"
        >
          <option value="all">Origen: Todos</option>
          <option value="web">Web</option>
          <option value="tokko">Tokko</option>
          <option value="portal">Portal</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-400 cursor-pointer outline-none [color-scheme:dark]"
        >
          <option value="all">Estado: Todos</option>
          <option value="pending">Pendiente</option>
          <option value="responded">Respondida</option>
          <option value="archived">Archivada</option>
        </select>
        <span className="text-xs text-zinc-600 ml-auto">
          {filtered.length} consulta{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-white/[0.04] rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-zinc-600 text-sm py-12">Sin consultas</p>
        ) : (
          filtered.map((r) => <InquiryRow key={r.id} row={r} onMarkResponded={markResponded} />)
        )}
      </div>
    </div>
  )
}

function InquiryRow({ row, onMarkResponded }: { row: Row; onMarkResponded: (id: string) => void }) {
  const fullName = `${row.contact_first_name} ${row.contact_last_name ?? ''}`.trim()
  const waLink = row.contact_phone
    ? `https://wa.me/${row.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${row.contact_first_name}, te contacto por tu consulta sobre la propiedad ${row.property_snapshot.address ?? ''}.`,
      )}`
    : null

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-wrap items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
        {(row.contact_first_name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold text-shell-text truncate">{fullName}</p>
        <p className="text-xs md:text-[11px] text-zinc-500 truncate">
          {row.property_snapshot.address ?? row.tokko_property_reference ?? 'Propiedad'}
        </p>
        <p className="text-xs md:text-[10px] text-zinc-600 mt-0.5">
          {format(new Date(row.last_inquired_at), "d MMM yyyy", { locale: es })} ·{' '}
          {formatDistanceToNow(new Date(row.last_inquired_at), { addSuffix: true, locale: es })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {row.source && (
          <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 uppercase">
            {row.source}
          </span>
        )}
        {row.status === 'pending' && (
          <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Pendiente</span>
        )}
        {row.status === 'responded' && (
          <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">Respondida</span>
        )}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir WhatsApp"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
          >
            <MessageCircle size={15} />
          </a>
        )}
        {row.status !== 'responded' && (
          <button
            onClick={() => onMarkResponded(row.id)}
            title="Marcar respondida"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] cursor-pointer"
          >
            <Check size={14} />
          </button>
        )}
        <Link
          href={`/productividad/contactos/${row.contact_id}`}
          title="Ver contacto"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] cursor-pointer"
        >
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  )
}
