'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, MessageCircle, Check, Mail, Phone, ExternalLink,
  Calendar, Tag, Home, AlertCircle, ChevronDown, UserPlus,
} from 'lucide-react'
import { notify } from '@/lib/stores/toastStore'

interface UserPreferences {
  operation_type?: number | null
  property_type?: string | null
  currency?: string | null
  price_min?: number | null
  price_max?: number | null
  zones?: string[] | null
  ambientes_min?: number | null
  ambientes_max?: number | null
  bedrooms_min?: number | null
  bedrooms_max?: number | null
  bathrooms_min?: number | null
  bathrooms_max?: number | null
  surface_total_min?: number | null
  surface_total_max?: number | null
  surface_covered_min?: number | null
  surface_covered_max?: number | null
  expenses_currency?: string | null
  expenses_min?: number | null
  expenses_max?: number | null
  antiguedad_anios?: number | null
  cochera_pct?: number | null
}

interface InquiryRow {
  id: string
  tokko_property_id: string
  tokko_property_reference: string | null
  property_snapshot: {
    address?: string | null
    publication_title?: string | null
    cover_photo_url?: string | null
    price?: number | null
    currency?: string | null
    operation_type?: number | null
    property_type?: string | null
    bedrooms?: number | null
    bathrooms?: number | null
    surface_total?: number | null
    surface_covered?: number | null
    location_name?: string | null
    location_full?: string | null
    _source?: string
  }
  source_portal: string | null
  status: string | null
  first_inquired_at: string
  last_inquired_at: string
  comment: string | null
  user_preferences: UserPreferences | null
  property_active: boolean | null
}

interface ContactPayload {
  contact: {
    id: string
    full_name: string
    email: string | null
    all_emails: string[]
    phone: string | null
    all_phones: string[]
    is_own: boolean
    viewer_role?: 'admin' | 'asesor'
    source: string | null
    lead_status: string | null
    created_at: string | null
  }
  inquiries: InquiryRow[]
}

export type ZoneMatchKind =
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

export interface DrawerProps {
  contactId: string
  inquiryId: string  // the specific inquiry that triggered the match (the one user clicked)
  currentPropertyId: string  // the property the user is currently viewing matches for
  matchData: {
    score: number
    breakdown: { zone: number; price: number; bedrooms: number; type: number }
    reasons_text: string
    score_source?: 'snapshot'
    match_type?: 'direct' | 'history'
    zone_kind?: ZoneMatchKind
  }
  currentProperty: {
    address: string
    price: string
    operation_type: string
    type: string
    bedrooms: number
  }
  onClose: () => void
}

const OP_LABEL: Record<number, string> = { 1: 'Venta', 2: 'Alquiler', 3: 'Alquiler temporal' }
const PORTAL_COLORS: Record<string, string> = {
  argenprop: 'bg-blue-500/15 text-blue-300',
  zonaprop: 'bg-orange-500/15 text-orange-300',
  web: 'bg-emerald-500/15 text-emerald-300',
  tokko: 'bg-zinc-700 text-text-secondary',
  manual: 'bg-purple-500/15 text-purple-300',
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function priceLabel(price: number | null | undefined, currency: string | null | undefined) {
  if (!price) return null
  return `${currency ?? 'USD'} ${Math.round(price).toLocaleString('es-AR')}`
}

export default function ContactDrawer(props: DrawerProps) {
  const { contactId, inquiryId, currentPropertyId, matchData, currentProperty, onClose } = props
  const [data, setData] = useState<ContactPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [markingResponded, setMarkingResponded] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [promoted, setPromoted] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/consultas/contact/${contactId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [contactId])

  const currentInquiry = data?.inquiries.find(i => i.id === inquiryId) ?? null

  async function handleMarkResponded() {
    if (!currentInquiry || markingResponded) return
    setMarkingResponded(true)
    try {
      const r = await fetch(`/api/consultas/inquiry/${currentInquiry.id}/responded`, {
        method: 'POST',
      })
      if (r.ok && data) {
        setData({
          ...data,
          inquiries: data.inquiries.map(i =>
            i.id === currentInquiry.id ? { ...i, status: 'responded' } : i,
          ),
        })
      }
    } finally {
      setMarkingResponded(false)
    }
  }

  // Promueve el lead a contacto personal (kind='personal') → pasa a aparecer en el módulo Contactos.
  async function handlePromote() {
    if (promoting || promoted) return
    setPromoting(true)
    try {
      const r = await fetch(`/api/consultas/contact/${contactId}/promote`, { method: 'POST' })
      if (r.ok) {
        setPromoted(true)
        notify('Guardado en tus Contactos')
      } else {
        notify('No se pudo guardar', 'error')
      }
    } finally {
      setPromoting(false)
    }
  }

  const waLink = data?.contact.phone
    ? `https://wa.me/${data.contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${data.contact.full_name.split(' ')[0]}, te contacto por tu consulta sobre ${currentProperty.address}.`,
      )}`
    : null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 h-full w-full md:w-[640px] bg-zinc-950 border-l border-border-default z-50 overflow-y-auto"
        role="dialog"
      >
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur z-10 flex items-center gap-3 px-4 h-14 border-b border-border-subtle">
          <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
            {(data?.contact.full_name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">
              {data?.contact.full_name ?? 'Cargando...'}
            </p>
            <p className="text-xs md:text-[10px] text-text-muted">
              {data?.contact.is_own ? 'Cartera propia' : 'Cartera de otro asesor'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-overlay-hover text-text-secondary cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-20 bg-surface-overlay rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="m-4 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        ) : !data || !currentInquiry ? (
          <p className="p-4 text-text-muted text-xs">Sin datos.</p>
        ) : (
          <div className="p-4 space-y-5">
            {/* ===== A. Por qué hay match ===== */}
            <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs md:text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Por qué hay match
                </h3>
                <span className="text-lg font-bold text-emerald-300">{matchData.score}/100</span>
              </div>

              {/* Match type banner */}
              {matchData.match_type && (
                <div className={`rounded-lg px-3 py-2 text-xs md:text-[11px] font-medium flex items-start gap-2 ${
                  matchData.match_type === 'direct'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                }`}>
                  <span className="shrink-0 mt-px">
                    {matchData.match_type === 'direct' ? '📩' : '🔗'}
                  </span>
                  <span>
                    {matchData.match_type === 'direct'
                      ? 'Esta persona consultó directamente por esta propiedad. El match es obvio porque la consulta fue específica.'
                      : 'Match basado en una propiedad compatible que consultó previamente. Sus intereses pasados coinciden con las características de esta propiedad.'}
                  </span>
                </div>
              )}

              {matchData.zone_kind === 'direct_match' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs md:text-[10px] font-bold">
                  🎯 Consulta directa por esta propiedad
                </div>
              )}
              {matchData.zone_kind === 'polygon_same' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-xs md:text-[10px] font-medium">
                  📍 Dentro del polígono Zonaprop
                </div>
              )}
              {matchData.zone_kind === 'polygon_approximate' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-500/20 text-text-secondary text-xs md:text-[10px] font-medium">
                  📍 Misma zona (aproximado)
                </div>
              )}
              {matchData.zone_kind === 'polygon_neighbor' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-xs md:text-[10px] font-medium">
                  📍 Barrio vecino (polígono adyacente)
                </div>
              )}
              <p className="text-xs text-text-secondary">{matchData.reasons_text}</p>
              <button
                onClick={() => setShowBreakdown(s => !s)}
                className="text-xs md:text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
                />
                {showBreakdown ? 'Ocultar' : 'Ver'} desglose del score
              </button>
              {showBreakdown && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="text-xs md:text-[10px] flex justify-between bg-surface-overlay rounded px-2 py-1">
                    <span className="text-text-muted">Zona (40%)</span>
                    <span className="font-bold text-text-primary">{matchData.breakdown.zone}/100</span>
                  </div>
                  <div className="text-xs md:text-[10px] flex justify-between bg-surface-overlay rounded px-2 py-1">
                    <span className="text-text-muted">Precio (30%)</span>
                    <span className="font-bold text-text-primary">{matchData.breakdown.price}/100</span>
                  </div>
                  <div className="text-xs md:text-[10px] flex justify-between bg-surface-overlay rounded px-2 py-1">
                    <span className="text-text-muted">Dormitorios (20%)</span>
                    <span className="font-bold text-text-primary">{matchData.breakdown.bedrooms}/100</span>
                  </div>
                  <div className="text-xs md:text-[10px] flex justify-between bg-surface-overlay rounded px-2 py-1">
                    <span className="text-text-muted">Tipo (10%)</span>
                    <span className="font-bold text-text-primary">{matchData.breakdown.type}/100</span>
                  </div>
                  {matchData.score_source && (
                    <div className="col-span-2 text-xs md:text-[10px] text-text-muted italic pt-1">
                      Fuente: snapshot de propiedad consultada
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ===== G. Preferencias declaradas (Zonaprop) ===== */}
            <PreferencesSection prefs={currentInquiry.user_preferences} />

            {/* ===== B. Propiedad consultada en su momento ===== */}
            <section className="space-y-2">
              <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Propiedad que consultó en su momento
              </h3>
              <div className="rounded-xl border border-border-subtle bg-surface-overlay overflow-hidden">
                {currentInquiry.property_snapshot.cover_photo_url && (
                  <div className="relative aspect-[16/9] bg-zinc-900">
                    <Image
                      src={currentInquiry.property_snapshot.cover_photo_url}
                      alt={currentInquiry.property_snapshot.address ?? ''}
                      fill
                      className="object-cover"
                      sizes="640px"
                    />
                    {currentInquiry.property_active === false && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-red-500/80 text-white text-xs md:text-[10px] font-bold">
                        Ya no en cartera
                      </span>
                    )}
                  </div>
                )}
                <div className="p-3 space-y-1.5">
                  {currentInquiry.tokko_property_reference && (
                    <p className="text-xs md:text-[10px] text-text-muted font-mono">
                      {currentInquiry.tokko_property_reference}
                    </p>
                  )}
                  <p className="text-sm font-bold text-text-primary">
                    {currentInquiry.property_snapshot.publication_title ??
                      currentInquiry.property_snapshot.address ??
                      'Propiedad'}
                  </p>
                  <p className="text-xs md:text-[11px] text-text-muted">
                    {currentInquiry.property_snapshot.address}
                  </p>
                  <p className="text-sm font-bold text-blue-400">
                    {priceLabel(
                      currentInquiry.property_snapshot.price,
                      currentInquiry.property_snapshot.currency,
                    ) ?? '—'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs md:text-[10px] text-text-muted pt-1">
                    {currentInquiry.property_snapshot.operation_type && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-overlay">
                        {OP_LABEL[currentInquiry.property_snapshot.operation_type] ?? 'Operación'}
                      </span>
                    )}
                    {currentInquiry.property_snapshot.property_type && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-overlay">
                        {currentInquiry.property_snapshot.property_type}
                      </span>
                    )}
                    {(currentInquiry.property_snapshot.bedrooms ?? 0) > 0 && (
                      <span>{currentInquiry.property_snapshot.bedrooms} dorm</span>
                    )}
                    {(currentInquiry.property_snapshot.bathrooms ?? 0) > 0 && (
                      <span>{currentInquiry.property_snapshot.bathrooms} baño</span>
                    )}
                    {(currentInquiry.property_snapshot.surface_total ?? 0) > 0 && (
                      <span>{currentInquiry.property_snapshot.surface_total} m²</span>
                    )}
                  </div>
                  {currentInquiry.property_active &&
                    String(currentInquiry.tokko_property_id) !== String(currentPropertyId) && (
                      <Link
                        href={`/consultas/${currentInquiry.tokko_property_id}`}
                        className="text-xs md:text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Ver matches de esa propiedad <ExternalLink size={11} />
                      </Link>
                    )}
                </div>
              </div>
            </section>

            {/* ===== C. Comparativa ===== */}
            <section className="space-y-2">
              <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Comparativa
              </h3>
              <div className="rounded-xl border border-border-subtle bg-surface-overlay overflow-hidden">
                <table className="w-full text-xs md:text-[11px]">
                  <thead className="bg-surface-overlay">
                    <tr>
                      <th className="text-left p-2 font-medium text-text-muted">Atributo</th>
                      <th className="text-left p-2 font-medium text-text-muted">Su consulta</th>
                      <th className="text-left p-2 font-medium text-text-muted">Esta propiedad</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ComparisonRow
                      label="Zona"
                      a={currentInquiry.property_snapshot.location_name ?? '—'}
                      b={currentProperty.address.split(',').pop()?.trim() ?? '—'}
                      score={matchData.breakdown.zone}
                    />
                    <ComparisonRow
                      label="Precio"
                      a={priceLabel(
                        currentInquiry.property_snapshot.price,
                        currentInquiry.property_snapshot.currency,
                      ) ?? '—'}
                      b={currentProperty.price}
                      score={matchData.breakdown.price}
                    />
                    <ComparisonRow
                      label="Dorm"
                      a={String(currentInquiry.property_snapshot.bedrooms ?? '—')}
                      b={String(currentProperty.bedrooms ?? '—')}
                      score={matchData.breakdown.bedrooms}
                    />
                    <ComparisonRow
                      label="Tipo"
                      a={currentInquiry.property_snapshot.property_type ?? '—'}
                      b={currentProperty.type}
                      score={matchData.breakdown.type}
                    />
                    <ComparisonRow
                      label="Operación"
                      a={
                        currentInquiry.property_snapshot.operation_type
                          ? OP_LABEL[currentInquiry.property_snapshot.operation_type] ?? '—'
                          : '—'
                      }
                      b={currentProperty.operation_type}
                      score={100}
                    />
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== D. Datos contacto ===== */}
            <section className="space-y-2">
              <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Datos del contacto
              </h3>
              <div className="rounded-xl border border-border-subtle bg-surface-overlay p-3 space-y-2">
                {(data.contact.email || data.contact.phone) ? (
                  <>
                    {data.contact.email && (
                      <div className="flex items-center gap-2 text-xs">
                        <Mail size={13} className="text-text-muted shrink-0" />
                        <span className="text-text-secondary truncate">{data.contact.email}</span>
                      </div>
                    )}
                    {data.contact.phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone size={13} className="text-text-muted shrink-0" />
                        <span className="text-text-secondary">{data.contact.phone}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs md:text-[11px] text-text-muted italic">
                    Datos sensibles ocultos — contacto pertenece a otro asesor
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <Calendar size={13} className="text-text-muted shrink-0" />
                  <span className="text-text-muted">
                    Primera consulta: {fmtDate(currentInquiry.first_inquired_at)}
                  </span>
                </div>
                {currentInquiry.source_portal && (
                  <div className="flex items-center gap-2 text-xs">
                    <Tag size={13} className="text-text-muted shrink-0" />
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs md:text-[10px] font-medium ${
                        PORTAL_COLORS[currentInquiry.source_portal] ?? 'bg-zinc-700 text-text-secondary'
                      }`}
                    >
                      {currentInquiry.source_portal}
                    </span>
                  </div>
                )}
                {currentInquiry.comment && (
                  <div className="pt-2 mt-2 border-t border-border-subtle">
                    <p className="text-xs md:text-[10px] text-text-muted mb-1">Mensaje original:</p>
                    <p className="text-xs md:text-[11px] text-text-secondary italic leading-relaxed">
                      &ldquo;{currentInquiry.comment.slice(0, 400)}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ===== E. Otras propiedades que consultó ===== */}
            {(() => {
              const otherInquiries = data.inquiries.filter(inq => inq.id !== currentInquiry.id)
              if (otherInquiries.length === 0) return null
              return (
                <section className="space-y-2">
                  <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    Otras propiedades que consultó en la inmobiliaria ({otherInquiries.length})
                  </h3>
                  <p className="text-xs md:text-[10px] text-text-muted">
                    Estas son las demás propiedades por las que esta persona se interesó. Te permite entender mejor su perfil de búsqueda.
                  </p>
                  <div className="rounded-xl border border-border-subtle bg-surface-overlay divide-y divide-white/[0.04]">
                    {otherInquiries.map(inq => {
                      const isCurrentProperty = String(inq.tokko_property_id) === String(currentPropertyId)
                      return (
                        <div
                          key={inq.id}
                          className={`p-2.5 flex items-center gap-2.5 hover:bg-surface-overlay transition-colors ${
                            isCurrentProperty ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500/40' : ''
                          }`}
                        >
                          {inq.property_snapshot.cover_photo_url ? (
                            <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-900">
                              <Image
                                src={inq.property_snapshot.cover_photo_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                              <Home size={16} className="text-zinc-700" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-[11px] font-medium text-text-primary truncate">
                              {inq.property_snapshot.publication_title ??
                                inq.property_snapshot.address ??
                                'Propiedad'}
                            </p>
                            <p className="text-xs md:text-[10px] text-text-muted">
                              {priceLabel(inq.property_snapshot.price, inq.property_snapshot.currency) ?? '—'}
                              {inq.property_snapshot.bedrooms ? ` · ${inq.property_snapshot.bedrooms} dorm` : ''}
                              {inq.property_snapshot.property_type ? ` · ${inq.property_snapshot.property_type}` : ''}
                            </p>
                            <p className="text-xs md:text-[10px] text-text-muted">
                              {fmtDate(inq.last_inquired_at)} · {inq.source_portal ?? 'tokko'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {inq.status && (
                              <span className={`text-xs md:text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                inq.status === 'responded'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-surface-overlay text-text-secondary'
                              }`}>
                                {inq.status === 'responded' ? 'Respondida' : inq.status}
                              </span>
                            )}
                            {inq.property_active &&
                              String(inq.tokko_property_id) !== String(currentPropertyId) && (
                                <Link
                                  href={`/consultas/${inq.tokko_property_id}`}
                                  className="text-xs md:text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                                >
                                  Ver matches <ExternalLink size={9} />
                                </Link>
                              )}
                            {!inq.property_active && (
                              <span className="text-xs md:text-[9px] text-red-400/60">No activa</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })()}

            {/* ===== F. Acciones ===== */}
            {(data.contact.is_own || data.contact.viewer_role === 'admin' || data.contact.phone) && (
              <section className="sticky bottom-0 -mx-4 px-4 py-3 bg-zinc-950/95 backdrop-blur border-t border-border-default flex flex-wrap gap-2">
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </a>
                )}
                {currentInquiry.status !== 'responded' && (
                  <button
                    onClick={handleMarkResponded}
                    disabled={markingResponded}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-bold hover:bg-blue-500/25 cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} />
                    {markingResponded ? 'Marcando...' : 'Marcar respondida'}
                  </button>
                )}
                {(data.contact.is_own || data.contact.viewer_role === 'admin') && (
                  <button
                    onClick={handlePromote}
                    disabled={promoting || promoted}
                    title="Convertir este lead en un contacto de tu red personal"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-bold hover:bg-purple-500/25 cursor-pointer disabled:opacity-50"
                  >
                    {promoted ? <Check size={14} /> : <UserPlus size={14} />}
                    {promoted ? 'Guardado en Contactos' : promoting ? 'Guardando...' : 'Guardar en mis contactos'}
                  </button>
                )}
              </section>
            )}
          </div>
        )}
      </aside>
    </>
  )
}

function PrefPill({
  children, emphasized,
}: { children: React.ReactNode; emphasized?: boolean }) {
  return (
    <span
      className={`text-xs md:text-[11px] px-2 py-1 rounded-md border whitespace-nowrap ${
        emphasized
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 font-medium'
          : 'border-border-default bg-surface-overlay text-text-secondary'
      }`}
    >
      {children}
    </span>
  )
}

function PreferencesSection({ prefs }: { prefs: UserPreferences | null }) {
  if (!prefs) return null
  const hasAny =
    prefs.operation_type ||
    prefs.price_max ||
    (prefs.zones?.length ?? 0) > 0 ||
    prefs.bedrooms_min ||
    prefs.ambientes_min
  if (!hasAny) return null

  const rng = (
    min: number | null | undefined,
    max: number | null | undefined,
    suffix: string,
  ): string | null => {
    if (min == null && max == null) return null
    if (min == null) return `Hasta ${max} ${suffix}`
    if (max == null || min === max) return `${min} ${suffix}`
    return `${min} a ${max} ${suffix}`
  }

  const fmt = (n: number) => n.toLocaleString('es-AR')
  const cur = prefs.currency ?? 'USD'
  const priceText =
    prefs.price_max && prefs.price_min
      ? prefs.price_min === prefs.price_max
        ? `${cur} ${fmt(prefs.price_min)}`
        : `${cur} ${fmt(prefs.price_min)} - ${cur} ${fmt(prefs.price_max)}`
      : null
  const opLabel = prefs.operation_type ? OP_LABEL[prefs.operation_type] ?? null : null
  const buscaText = prefs.property_type
    ? opLabel
      ? `${prefs.property_type} en ${opLabel}`
      : prefs.property_type
    : opLabel

  const expCur = prefs.expenses_currency ?? 'ARS'
  const expText =
    prefs.expenses_min && prefs.expenses_max
      ? `Entre ${expCur}${fmt(prefs.expenses_min)} a ${expCur}${fmt(prefs.expenses_max)} expensas`
      : null

  const ambText = rng(prefs.ambientes_min, prefs.ambientes_max, 'Ambientes')
  const dormText = rng(prefs.bedrooms_min, prefs.bedrooms_max, 'Dormitorios')
  const totText = rng(prefs.surface_total_min, prefs.surface_total_max, 'm² Totales')
  const cubText = rng(prefs.surface_covered_min, prefs.surface_covered_max, 'm² Cubiertos')
  const banText = rng(prefs.bathrooms_min, prefs.bathrooms_max, 'Baños')

  const hasChars =
    ambText || dormText || banText || totText || cubText || expText ||
    prefs.antiguedad_anios || prefs.cochera_pct != null

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-wider">
          Preferencias declaradas
        </h3>
        <span className="text-xs md:text-[9px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 font-medium uppercase">
          Zonaprop
        </span>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-overlay divide-y divide-white/[0.04]">
        {(buscaText || priceText) && (
          <div className="p-3 space-y-1.5">
            <p className="text-xs md:text-[10px] text-text-muted font-medium">Tu contacto busca:</p>
            <div className="flex flex-wrap items-center gap-2">
              {buscaText && <PrefPill>{buscaText}</PrefPill>}
              {priceText && <PrefPill emphasized>{priceText}</PrefPill>}
            </div>
          </div>
        )}

        {(prefs.zones?.length ?? 0) > 0 && (
          <div className="p-3 space-y-1.5">
            <p className="text-xs md:text-[10px] text-text-muted font-medium">
              Le interesa encontrar una propiedad en:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {prefs.zones!.map((z, i) => (
                <PrefPill key={i}>{z}</PrefPill>
              ))}
            </div>
          </div>
        )}

        {hasChars && (
          <div className="p-3 space-y-1.5">
            <p className="text-xs md:text-[10px] text-text-muted font-medium">
              Con las siguientes características:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ambText && <PrefPill>{ambText}</PrefPill>}
              {dormText && <PrefPill>{dormText}</PrefPill>}
              {totText && <PrefPill>{totText}</PrefPill>}
              {expText && <PrefPill>{expText}</PrefPill>}
              {banText && <PrefPill>{banText}</PrefPill>}
              {prefs.antiguedad_anios != null && (
                <PrefPill>{`${prefs.antiguedad_anios} Años`}</PrefPill>
              )}
              {prefs.cochera_pct != null && (
                <PrefPill>{`${prefs.cochera_pct}% tienen cochera`}</PrefPill>
              )}
              {cubText && <PrefPill>{cubText}</PrefPill>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function ComparisonRow({
  label, a, b, score,
}: { label: string; a: string; b: string; score: number }) {
  const match = score >= 80 ? 'ok' : score >= 40 ? 'partial' : 'no'
  const icon = match === 'ok' ? '✓' : match === 'partial' ? '≈' : '✗'
  const cls = match === 'ok'
    ? 'text-emerald-400'
    : match === 'partial'
      ? 'text-amber-400'
      : 'text-red-400'
  return (
    <tr className="border-t border-border-subtle">
      <td className="p-2 text-text-muted">{label}</td>
      <td className="p-2 text-text-secondary">{a}</td>
      <td className="p-2 text-text-secondary">
        <span className="flex items-center gap-1.5">
          {b} <span className={`text-sm font-bold ${cls}`}>{icon}</span>
        </span>
      </td>
    </tr>
  )
}
