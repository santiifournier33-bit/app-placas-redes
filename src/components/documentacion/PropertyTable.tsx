"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, FileText, CheckCircle2, XCircle, AlertTriangle, CloudOff } from "lucide-react"
import { STATUS_CONFIG, CATEGORY_LABELS, type PropertyStatus } from "@/lib/docs/doc-requirements"
import type { PropertyDocStatus } from "@/lib/docs/doc-analyzer"

interface PropertyTableProps {
  properties: PropertyDocStatus[]
  loading?: boolean
  onPropertyClick?: (property: PropertyDocStatus) => void
}

const STATUS_ICONS: Record<PropertyStatus, typeof CheckCircle2> = {
  complete: CheckCircle2,
  partial: AlertTriangle,
  incomplete: XCircle,
  missing: XCircle,
  unsynced: CloudOff,
}

const STATUS_COLORS: Record<PropertyStatus, string> = {
  complete: "text-emerald-400",
  partial: "text-amber-400",
  incomplete: "text-amber-400",
  missing: "text-red-400",
  unsynced: "text-zinc-500",
}

const STATUS_BG: Record<PropertyStatus, string> = {
  complete: "bg-emerald-500/10",
  partial: "bg-amber-500/10",
  incomplete: "bg-amber-500/10",
  missing: "bg-red-500/10",
  unsynced: "bg-zinc-500/10",
}

export function PropertyTable({ properties, loading, onPropertyClick }: PropertyTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 rounded-xl skeleton" />
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
        <p className="text-zinc-500 text-sm">No se encontraron propiedades con esos filtros</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header - desktop only */}
      <div className="hidden lg:grid grid-cols-[60px_1fr_160px_90px_120px_44px] gap-3 px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.12em]">
        <span>ID</span>
        <span>Propiedad</span>
        <span>Asesor</span>
        <span>Op.</span>
        <span>Status</span>
        <span></span>
      </div>

      {properties.map(prop => (
        <PropertyRow
          key={prop.id}
          property={prop}
          expanded={expandedId === prop.id}
          onToggle={() => setExpandedId(expandedId === prop.id ? null : prop.id)}
          onClick={() => onPropertyClick?.(prop)}
        />
      ))}
    </div>
  )
}

function PropertyRow({ property: p, expanded, onToggle, onClick }: {
  property: PropertyDocStatus
  expanded: boolean
  onToggle: () => void
  onClick: () => void
}) {
  const StatusIcon = STATUS_ICONS[p.status]
  const statusColor = STATUS_COLORS[p.status]
  const statusBg = STATUS_BG[p.status]
  const config = STATUS_CONFIG[p.status]

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      expanded
        ? "border-white/[0.1] bg-white/[0.03]"
        : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.06]"
    }`}>
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full cursor-pointer"
      >
        {/* Desktop layout */}
        <div className="hidden lg:grid grid-cols-[60px_1fr_160px_90px_120px_44px] gap-3 items-center px-4 py-3">
          <span className="text-xs text-zinc-500 font-mono tabular-nums">{p.id}</span>
          <div className="text-left">
            <p className="text-sm font-medium text-shell-text truncate">
              {p.type} {p.location}
            </p>
            {p.fileCount > 0 && (
              <p className="text-[11px] text-zinc-500">{p.fileCount} archivos</p>
            )}
          </div>
          <span className="text-xs text-zinc-400 truncate">{p.agent}</span>
          <span className="text-xs text-zinc-500">{p.operation}</span>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${statusBg} w-fit`}>
            <StatusIcon size={12} strokeWidth={2} className={statusColor} />
            <span className={`text-[11px] font-semibold ${statusColor}`}>{config.label}</span>
          </div>
          <div className="flex items-center justify-center">
            {expanded ? <ChevronDown size={16} className="text-zinc-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-shell-text">{p.type} {p.location}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {p.agent} • {p.operation} • ID {p.id}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${statusBg}`}>
                <StatusIcon size={11} strokeWidth={2} className={statusColor} />
                <span className={`text-[10px] font-semibold ${statusColor}`}>{config.label}</span>
              </div>
              {expanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.04] space-y-3">
          {/* Doc pills */}
          <div className="flex flex-wrap gap-1.5">
            {p.docsPresent.map(doc => (
              <span
                key={doc.category}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[11px] font-medium text-emerald-400"
              >
                <CheckCircle2 size={11} strokeWidth={2} />
                {doc.label}
              </span>
            ))}
            {p.docsMissing.map(doc => (
              <span
                key={doc.category}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                  doc.priority === "obligatorio"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                <XCircle size={11} strokeWidth={2} />
                {doc.label}
              </span>
            ))}
            {p.unclassifiedFiles.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-500/10 text-[11px] font-medium text-zinc-400">
                <FileText size={11} strokeWidth={2} />
                {p.unclassifiedFiles.length} sin clasificar
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
            >
              <FileText size={12} strokeWidth={2} />
              Ver detalle
            </button>
            {p.driveUrl && (
              <a
                href={p.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
              >
                <ExternalLink size={12} strokeWidth={2} />
                Abrir en Drive
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
