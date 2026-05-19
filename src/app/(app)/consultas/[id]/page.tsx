'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, ExternalLink, AlertCircle } from 'lucide-react'

interface Match {
  inquiry_id: string
  contact_id: string
  score: number
  breakdown: { zone: number; price: number; bedrooms: number; type: number }
  reasons_text: string
  recency_bucket: 'green' | 'yellow' | 'orange' | 'red'
  last_inquired_at: string
  owner_id: string | null
  source: string | null
  status: string | null
  full_name: string
  email: string | null
  phone: string | null
  is_own: boolean
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

const RECENCY_COLOR: Record<Match['recency_bucket'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
}

const RECENCY_LABEL: Record<Match['recency_bucket'], string> = {
  green: '< 3 meses',
  yellow: '< 6 meses',
  orange: '6-12 meses',
  red: '> 12 meses',
}

export default function ConsultaPropertyDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const propertyId = params.id

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingProp, setLoadingProp] = useState(true)
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) return
    // Fetch property from /api/properties cache then find by id
    fetch('/api/properties')
      .then((r) => r.json())
      .then((d) => {
        const p = (d.properties ?? []).find((x: PropertyDetail) => String(x.id) === String(propertyId))
        setProperty(p ?? null)
      })
      .finally(() => setLoadingProp(false))

    fetch(`/api/consultas/matches?property_id=${propertyId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setMatches(d.matches ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMatches(false))
  }, [propertyId])

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
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
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
                    <Image src={property.photo} alt={property.title} fill className="object-cover" sizes="(min-width:1280px) 33vw, 100vw" />
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
          <div className="p-4 space-y-2">
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">
              Contactos compatibles
            </h3>
            {loadingMatches ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-20 bg-white/[0.04] rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : matches.length === 0 ? (
              <p className="text-xs text-zinc-600 py-8 text-center">
                Sin contactos compatibles para esta propiedad.
              </p>
            ) : (
              matches.map((m) => <MatchCard key={m.inquiry_id} match={m} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const scoreColor =
    match.score >= 80
      ? 'bg-emerald-500/15 text-emerald-300'
      : match.score >= 60
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-orange-500/15 text-orange-300'

  const waLink = match.phone
    ? `https://wa.me/${match.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${match.full_name}, te contacto por la consulta que hiciste sobre una propiedad en nuestra inmobiliaria.`,
      )}`
    : null

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
          {(match.full_name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-shell-text truncate">{match.full_name}</p>
            <span
              className={`w-2 h-2 rounded-full ${RECENCY_COLOR[match.recency_bucket]}`}
              title={RECENCY_LABEL[match.recency_bucket]}
            />
            {!match.is_own && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                Cartera de otro asesor
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{match.reasons_text}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-xs font-bold shrink-0 ${scoreColor}`}>
          {match.score}
        </span>
      </div>

      {match.is_own && (
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
          <Link
            href={`/productividad/contactos/${match.contact_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 text-xs font-medium hover:bg-white/[0.08] cursor-pointer"
          >
            <ExternalLink size={13} />
            Ver contacto
          </Link>
        </div>
      )}
    </div>
  )
}
