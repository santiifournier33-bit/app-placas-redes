'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TokkoProperty {
  id: number
  reference_code: string
  type: string
  operation_type: string
  title: string
  address: string
  location: string
  price: string
  price_raw: number
  currency: string
  thumbnail: string
  rooms: number
  bedrooms: number
  bathrooms: number
  surface_total: number
}

const OP_FILTERS = ['Todas', 'Venta', 'Alquiler', 'Alquiler Temporal']
const TYPE_FILTERS = ['Todos', 'Casa', 'Departamento', 'PH', 'Terreno', 'Local', 'Oficina', 'Cochera']

const supabase = createClient()

export default function ConsultasPage() {
  const [props, setProps] = useState<TokkoProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [opFilter, setOpFilter] = useState('Todas')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [matchCounts, setMatchCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then((d) => setProps(d.properties ?? []))
      .catch(() => setProps([]))
      .finally(() => setLoading(false))
  }, [])

  // Compute match counts per property in one batch query
  useEffect(() => {
    if (props.length === 0) return
    const propIds = props.map((p) => String(p.id))
    supabase
      .from('inquiries')
      .select('tokko_property_id')
      .in('tokko_property_id', propIds)
      .then(({ data }) => {
        const counts = new Map<string, number>()
        for (const row of data ?? []) {
          const k = String(row.tokko_property_id)
          counts.set(k, (counts.get(k) ?? 0) + 1)
        }
        setMatchCounts(counts)
      })
  }, [props])

  const filtered = useMemo(() => {
    return props.filter((p) => {
      if (opFilter !== 'Todas' && p.operation_type !== opFilter) return false
      if (typeFilter !== 'Todos' && p.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${p.title} ${p.address} ${p.location} ${p.reference_code}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [props, opFilter, typeFilter, search])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-white/[0.06] shrink-0">
        <MessageSquare size={18} className="text-blue-400" />
        <h1 className="text-sm font-bold text-shell-text">Consultas</h1>
        <Link
          href="/consultas/mis-consultas"
          className="ml-auto text-[11px] text-blue-400 hover:underline"
        >
          Mis consultas →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-1.5 border border-white/[0.06] flex-1 max-w-xs">
          <Search size={14} className="text-zinc-600 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar propiedad..."
            className="flex-1 bg-transparent text-sm text-shell-text placeholder:text-zinc-700 outline-none"
          />
        </div>
        <select
          value={opFilter}
          onChange={(e) => setOpFilter(e.target.value)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-400 cursor-pointer outline-none [color-scheme:dark]"
        >
          {OP_FILTERS.map((o) => (
            <option key={o} value={o}>
              Operación: {o}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-400 cursor-pointer outline-none [color-scheme:dark]"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t} value={t}>
              Tipo: {t}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-600 ml-auto">
          {filtered.length} {filtered.length === 1 ? 'propiedad' : 'propiedades'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse aspect-[4/3] bg-white/[0.04] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-zinc-600 text-sm py-12">Sin propiedades</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                matchCount={matchCounts.get(String(p.id)) ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PropertyCard({ property, matchCount }: { property: TokkoProperty; matchCount: number }) {
  const opColor =
    property.operation_type === 'Venta'
      ? 'bg-emerald-500/15 text-emerald-400'
      : property.operation_type.startsWith('Alquiler Temporal')
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-blue-500/15 text-blue-400'

  return (
    <Link
      href={`/consultas/${property.id}`}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-colors cursor-pointer flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-zinc-900">
        {property.thumbnail ? (
          <Image
            src={property.thumbnail}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(min-width:1280px) 25vw, (min-width:768px) 50vw, 100vw"
          />
        ) : null}
        {matchCount > 0 && (
          <span
            className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-blue-500 text-white text-[11px] font-bold shadow"
            title="Contactos que consultaron exactamente esta propiedad. Abrí para ver también contactos compatibles."
          >
            {matchCount} consulta{matchCount !== 1 ? 's' : ''}
          </span>
        )}
        <span
          className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-medium ${opColor}`}
        >
          {property.operation_type}
        </span>
      </div>
      <div className="p-3 space-y-1 flex-1 flex flex-col">
        <p className="text-xs font-bold text-shell-text truncate">{property.title}</p>
        <p className="text-[11px] text-zinc-500 truncate">{property.address}</p>
        <p className="text-sm font-bold text-zinc-200 mt-auto">{property.price}</p>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          {property.bedrooms > 0 && <span>{property.bedrooms} dorm</span>}
          {property.bathrooms > 0 && <span>{property.bathrooms} baño</span>}
          {property.surface_total > 0 && <span>{property.surface_total} m²</span>}
        </div>
      </div>
    </Link>
  )
}
