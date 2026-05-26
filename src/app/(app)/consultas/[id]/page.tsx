'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, MessageCircle, AlertCircle, ChevronDown, ArrowUpDown } from 'lucide-react'
import ContactDrawer from '@/components/consultas/ContactDrawer'

type ZoneKind =
  | 'direct_match'
  | 'polygon_same'
  | 'polygon_approximate'
  | 'polygon_neighbor'
  | 'string_barrio'
  | 'haversine_close'
  | 'haversine_mid'
  | 'string_localidad'
  | 'string_partido'
  | 'none'

interface Match {
  inquiry_id: string
  contact_id: string
  score: number
  breakdown: { zone: number; price: number; bedrooms: number; type: number }
  zone_kind?: ZoneKind
  score_source?: 'snapshot'
  match_type: 'direct' | 'history'
  reasons_text: string
  recency_bucket: 'green' | 'yellow' | 'orange' | 'red'
  last_inquired_at: string
  owner_id: string | null
  source: string | null
  source_portal?: string | null
  status: string | null
  full_name: string
  email: string | null
  phone: string | null
  is_own: boolean
  can_see_pii: boolean
  total_consultas?: number
  primera_consulta?: string
  ultima_consulta?: string
  portales?: string[]
  soft_fail_reasons?: string[] | null
}

interface PropertyDetail {
  id: number
  title: string
  address: string
  location: string
  price: string
  operation_type: string
  type: string
  bedrooms: number
  bathrooms: number
  surface_total: number
  description: string
  photo: string
  reference_code: string
}

const RECENCY_BG: Record<Match['recency_bucket'], string> = {
  green: 'bg-emerald-500/15 text-emerald-300',
  yellow: 'bg-amber-500/15 text-amber-300',
  orange: 'bg-orange-500/15 text-orange-300',
  red: 'bg-red-500/15 text-red-300',
}

const RECENCY_LABEL: Record<Match['recency_bucket'], string> = {
  green: '< 3 meses',
  yellow: '< 6 meses',
  orange: '6-12 meses',
  red: '> 12 meses',
}

const PORTAL_COLORS: Record<string, string> = {
  argenprop: 'bg-blue-500/15 text-blue-300',
  zonaprop: 'bg-orange-500/15 text-orange-300',
  web: 'bg-emerald-500/15 text-emerald-300',
  tokko: 'bg-zinc-700 text-zinc-300',
  manual: 'bg-purple-500/15 text-purple-300',
}

type SortMode = 'score' | 'recency'

export default function ConsultaPropertyDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const propertyId = params.id

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingProp, setLoadingProp] = useState(true)
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [sortMode, setSortMode] = useState<SortMode>('score')
  const [onlyOwn, setOnlyOwn] = useState(false)
  const [portalFilter, setPortalFilter] = useState<string>('all')
  const [matchTypeFilter, setMatchTypeFilter] = useState<'all' | 'direct' | 'history'>('all')
  const [expandedBreakdown, setExpandedBreakdown] = useState<Set<string>>(new Set())
  const [drawerMatch, setDrawerMatch] = useState<Match | null>(null)

  useEffect(() => {
    if (!propertyId) return
    fetch('/api/properties')
      .then(r => r.json())
      .then(d => {
        const p = (d.properties ?? []).find((x: PropertyDetail) => String(x.id) === String(propertyId))
        setProperty(p ?? null)
      })
      .finally(() => setLoadingProp(false))

    fetch(`/api/consultas/matches?property_id=${propertyId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setMatches(d.matches ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingMatches(false))
  }, [propertyId])

  const visible = useMemo(() => {
    let arr = [...matches]
    if (onlyOwn) arr = arr.filter(m => m.is_own)
    if (portalFilter !== 'all') {
      arr = arr.filter(m => (m.source_portal ?? m.source) === portalFilter)
    }
    if (matchTypeFilter !== 'all') {
      arr = arr.filter(m => m.match_type === matchTypeFilter)
    }
    if (sortMode === 'score') arr.sort((a, b) => b.score - a.score)
    else arr.sort((a, b) => new Date(b.last_inquired_at).getTime() - new Date(a.last_inquired_at).getTime())
    return arr
  }, [matches, onlyOwn, portalFilter, matchTypeFilter, sortMode])

  const matchTypeCounts = useMemo(() => {
    const c = { all: matches.length, direct: 0, history: 0 }
    for (const m of matches) {
      if (m.match_type === 'direct') c.direct++
      else if (m.match_type === 'history') c.history++
    }
    return c
  }, [matches])

  const portalCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of matches) {
      const k = x.source_portal ?? x.source ?? 'tokko'
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [matches])

  function toggleBreakdown(id: string) {
    setExpandedBreakdown(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-white/[0.06] shrink-0">
        <button
          onClick={() => router.push('/consultas')}
          className="p-2 rounded-xl hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 cursor-pointer"
          title="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-bold text-shell-text truncate flex-1">
          {property?.title ?? 'Propiedad'}
        </h1>
        <span className="text-xs text-zinc-600">
          {visible.length}/{matches.length} · {matchTypeCounts.direct} directas · {matchTypeCounts.history} macheos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] divide-y xl:divide-y-0 xl:divide-x divide-white/[0.06]">
          {/* Property panel */}
          <div className="p-4 space-y-3">
            {loadingProp ? (
              <div className="animate-pulse aspect-[4/3] bg-white/[0.04] rounded-2xl" />
            ) : property ? (
              <>
                <div className="relative aspect-[4/3] bg-zinc-900 rounded-2xl overflow-hidden">
                  {property.photo && (
                    <Image
                      src={property.photo}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="(min-width:1280px) 33vw, 100vw"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">{property.reference_code}</p>
                  <h2 className="text-base font-bold text-shell-text">{property.title}</h2>
                  <p className="text-sm text-zinc-400">{property.address}</p>
                  <p className="text-lg font-bold text-blue-400 mt-2">{property.price}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500 mt-2">
                    <span className="px-2 py-0.5 rounded bg-white/[0.04]">{property.operation_type}</span>
                    <span className="px-2 py-0.5 rounded bg-white/[0.04]">{property.type}</span>
                    {property.bedrooms > 0 && <span>{property.bedrooms} dorm</span>}
                    {property.bathrooms > 0 && <span>{property.bathrooms} baño</span>}
                    {property.surface_total > 0 && <span>{property.surface_total} m²</span>}
                  </div>
                  {property.description && (
                    <p className="text-xs text-zinc-500 mt-3 leading-relaxed">{property.description}</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-600">No se encontró la propiedad</p>
            )}
          </div>

          {/* Matches list */}
          <div className="p-4 space-y-3">
            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <h3 className="text-xs md:text-[10px] font-bold text-zinc-600 uppercase tracking-wider mr-auto">
                Contactos compatibles
              </h3>
              <button
                onClick={() => setSortMode(m => m === 'score' ? 'recency' : 'score')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 cursor-pointer"
                title="Cambiar orden"
              >
                <ArrowUpDown size={12} />
                {sortMode === 'score' ? 'Por score' : 'Por recencia'}
              </button>
              <button
                onClick={() => setOnlyOwn(o => !o)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  onlyOwn ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]'
                }`}
              >
                Solo mis contactos
              </button>
            </div>

            {/* Match Type tabs */}
            <div className="flex flex-wrap gap-1 border-b border-white/[0.04] pb-2">
              <button
                onClick={() => setMatchTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs md:text-[10px] font-bold transition-all cursor-pointer ${
                  matchTypeFilter === 'all'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'bg-white/[0.03] text-zinc-500 border border-transparent hover:bg-white/[0.06]'
                }`}
              >
                Todos ({matchTypeCounts.all})
              </button>
              <button
                onClick={() => setMatchTypeFilter('direct')}
                className={`px-2.5 py-1 rounded-lg text-xs md:text-[10px] font-bold transition-all cursor-pointer ${
                  matchTypeFilter === 'direct'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/[0.03] text-zinc-500 border border-transparent hover:bg-white/[0.06]'
                }`}
              >
                Consultas directas ({matchTypeCounts.direct})
              </button>
              <button
                onClick={() => setMatchTypeFilter('history')}
                className={`px-2.5 py-1 rounded-lg text-xs md:text-[10px] font-bold transition-all cursor-pointer ${
                  matchTypeFilter === 'history'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/[0.03] text-zinc-500 border border-transparent hover:bg-white/[0.06]'
                }`}
              >
                Por historial ({matchTypeCounts.history})
              </button>
            </div>

            {/* Portal chips */}
            {portalCounts.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setPortalFilter('all')}
                  className={`px-2 py-0.5 rounded text-xs md:text-[10px] font-medium cursor-pointer ${
                    portalFilter === 'all'
                      ? 'bg-white/[0.12] text-zinc-200'
                      : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.06]'
                  }`}
                >
                  Todos ({matches.length})
                </button>
                {[...portalCounts.entries()].map(([portal, count]) => (
                  <button
                    key={portal}
                    onClick={() => setPortalFilter(portal)}
                    className={`px-2 py-0.5 rounded text-xs md:text-[10px] font-medium cursor-pointer ${
                      portalFilter === portal
                        ? PORTAL_COLORS[portal] ?? 'bg-zinc-700 text-zinc-300'
                        : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.06]'
                    }`}
                  >
                    {portal} ({count})
                  </button>
                ))}
              </div>
            )}

            {loadingMatches ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-20 bg-white/[0.04] rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : visible.length === 0 ? (
              <p className="text-xs text-zinc-600 py-8 text-center">
                {matches.length === 0
                  ? 'Sin contactos compatibles para esta propiedad.'
                  : 'Ningún match con los filtros actuales.'}
              </p>
            ) : (
              visible.map(m => (
                <MatchCard
                  key={m.inquiry_id}
                  match={m}
                  expandedBreakdown={expandedBreakdown.has(m.inquiry_id)}
                  onToggleBreakdown={() => toggleBreakdown(m.inquiry_id)}
                  onOpenDrawer={() => setDrawerMatch(m)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {drawerMatch && property && (
        <ContactDrawer
          contactId={drawerMatch.contact_id}
          inquiryId={drawerMatch.inquiry_id}
          currentPropertyId={String(propertyId)}
          matchData={{
            score: drawerMatch.score,
            breakdown: drawerMatch.breakdown,
            reasons_text: drawerMatch.reasons_text,
            score_source: drawerMatch.score_source,
            match_type: drawerMatch.match_type,
            zone_kind: drawerMatch.zone_kind,
          }}
          currentProperty={{
            address: property.address,
            price: property.price,
            operation_type: property.operation_type,
            type: property.type,
            bedrooms: property.bedrooms,
          }}
          onClose={() => setDrawerMatch(null)}
        />
      )}
    </div>
  )
}

function MatchCard({
  match, expandedBreakdown, onToggleBreakdown, onOpenDrawer,
}: {
  match: Match
  expandedBreakdown: boolean
  onToggleBreakdown: () => void
  onOpenDrawer: () => void
}) {
  const scoreColor =
    match.score >= 80
      ? 'bg-emerald-500/15 text-emerald-300'
      : match.score >= 60
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-orange-500/15 text-orange-300'

  const waLink = match.phone && match.can_see_pii
    ? `https://wa.me/${match.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${match.full_name}, te contacto por tu consulta sobre una propiedad en nuestra inmobiliaria.`,
      )}`
    : null

  const portal = match.source_portal ?? match.source ?? 'tokko'
  const portalCls = PORTAL_COLORS[portal] ?? 'bg-zinc-700 text-zinc-300'
  const recencyCls = RECENCY_BG[match.recency_bucket]

  const MATCH_TYPE_BADGES = {
    direct: { text: 'Consulta directa', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    history: { text: 'Por historial', cls: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' }
  }
  const matchTypeBadge = MATCH_TYPE_BADGES[match.match_type]

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
          {(match.full_name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenDrawer}
              className={`text-sm font-bold truncate cursor-pointer hover:underline px-1.5 py-0.5 rounded ${recencyCls}`}
              title={`Recencia: ${RECENCY_LABEL[match.recency_bucket]}`}
            >
              {match.full_name}
            </button>
            <span className={`text-xs md:text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${portalCls}`}>
              {portal}
            </span>
            {matchTypeBadge && (
              <span className={`text-xs md:text-[9px] px-1.5 py-0.5 rounded font-bold ${matchTypeBadge.cls}`}>
                {matchTypeBadge.text}
              </span>
            )}
            {match.soft_fail_reasons && match.soft_fail_reasons.length > 0 && (
              <span
                className="text-xs md:text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20"
                title={match.soft_fail_reasons.join(' · ')}
              >
                Interés zonal
              </span>
            )}
            {!match.is_own && (
              <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                Otro asesor
              </span>
            )}
          </div>
          {match.can_see_pii && match.email && (
            <p className="text-xs md:text-[10px] text-zinc-500 mt-0.5 truncate">{match.email}</p>
          )}
          <p className="text-xs md:text-[11px] text-zinc-500 mt-1">{match.reasons_text}</p>
          {match.total_consultas != null && match.total_consultas > 1 && (
            <p className="text-xs md:text-[10px] text-amber-400/80 mt-1">
              Consultó {match.total_consultas} veces
              {match.ultima_consulta && ` · última ${formatRelativeDays(match.ultima_consulta)}`}
              {match.portales && match.portales.length > 1 && ` · ${match.portales.join(' + ')}`}
            </p>
          )}
        </div>
        <button
          onClick={onToggleBreakdown}
          className={`px-2 py-0.5 rounded-md text-xs font-bold shrink-0 cursor-pointer hover:opacity-80 ${scoreColor} flex items-center gap-1`}
          title="Ver desglose del score"
        >
          {match.score}
          <ChevronDown
            size={10}
            className={`transition-transform ${expandedBreakdown ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expandedBreakdown && (
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/[0.04]">
          <BreakdownPill label="Zona" value={match.breakdown.zone} />
          <BreakdownPill label="Precio" value={match.breakdown.price} />
          <BreakdownPill label="Dorm" value={match.breakdown.bedrooms} />
          <BreakdownPill label="Tipo" value={match.breakdown.type} />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 cursor-pointer"
          >
            <MessageCircle size={13} />
            WhatsApp
          </a>
        )}
        <button
          onClick={onOpenDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 text-xs font-medium hover:bg-white/[0.08] cursor-pointer"
        >
          Ver contacto
        </button>
      </div>
    </div>
  )
}

function formatRelativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'hoy'
  if (days === 1) return 'hace 1 día'
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  if (months === 1) return 'hace 1 mes'
  if (months < 12) return `hace ${months} meses`
  const years = Math.floor(months / 12)
  return years === 1 ? 'hace 1 año' : `hace ${years} años`
}

function BreakdownPill({ label, value }: { label: string; value: number }) {
  const cls =
    value >= 80 ? 'bg-emerald-500/10 text-emerald-300'
      : value >= 40 ? 'bg-amber-500/10 text-amber-300'
        : 'bg-zinc-800/50 text-zinc-500'
  return (
    <div className={`rounded-md px-2 py-1 text-xs md:text-[10px] ${cls}`}>
      <div className="opacity-70">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  )
}
