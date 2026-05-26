"use client"

import { STATUS_CONFIG, type PropertyStatus } from "@/lib/docs/doc-requirements"
import { FolderOpen, CheckCircle2, AlertTriangle, XCircle, CloudOff } from "lucide-react"
import type { ReactNode } from "react"

interface DocKPICardsProps {
  total: number
  complete: number
  partial: number
  incomplete: number
  missing: number
  unsynced: number
  percentage: number
  loading?: boolean
}

const ICONS: Record<string, ReactNode> = {
  total: <FolderOpen size={20} strokeWidth={1.8} />,
  complete: <CheckCircle2 size={20} strokeWidth={1.8} />,
  incomplete: <AlertTriangle size={20} strokeWidth={1.8} />,
  faltante: <XCircle size={20} strokeWidth={1.8} />,
}

const COLORS = {
  total: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400/70", bar: "bg-blue-500" },
  complete: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "text-emerald-400/70", bar: "bg-emerald-500" },
  incomplete: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-400/70", bar: "bg-amber-500" },
  faltante: { bg: "bg-red-500/10", text: "text-red-400", icon: "text-red-400/70", bar: "bg-red-500" },
}

export function DocKPICards({ total, complete, partial, incomplete, missing, unsynced, percentage, loading }: DocKPICardsProps) {
  const faltante = missing + unsynced

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[104px] rounded-2xl skeleton" />
          ))}
        </div>
        <div className="h-3 rounded-full skeleton" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          icon={ICONS.total}
          label="Propiedades"
          value={total}
          color={COLORS.total}
        />
        <KPICard
          icon={ICONS.complete}
          label="Completa"
          value={complete}
          subtitle={total > 0 ? `${Math.round((complete / total) * 100)}%` : "0%"}
          color={COLORS.complete}
        />
        <KPICard
          icon={ICONS.incomplete}
          label="Incompleta"
          value={incomplete}
          subtitle={total > 0 ? `${Math.round((incomplete / total) * 100)}%` : "0%"}
          color={COLORS.incomplete}
        />
        <KPICard
          icon={ICONS.faltante}
          label="Sin docs"
          value={faltante}
          subtitle={unsynced > 0 ? `${unsynced} sin sync` : undefined}
          color={COLORS.faltante}
        />
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em]">
            Progreso general
          </span>
          <span className="text-sm font-bold text-text-primary tabular-nums">{percentage}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-surface-overlay overflow-hidden">
          <div className="h-full flex">
            {total > 0 && (
              <>
                <div
                  className="bg-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${(complete / total) * 100}%` }}
                />
                <div
                  className="bg-amber-500 transition-all duration-700 ease-out"
                  style={{ width: `${(incomplete / total) * 100}%` }}
                />
                <div
                  className="bg-red-500/50 transition-all duration-700 ease-out"
                  style={{ width: `${(missing / total) * 100}%` }}
                />
                <div
                  className="bg-zinc-700/50 transition-all duration-700 ease-out"
                  style={{ width: `${(unsynced / total) * 100}%` }}
                />
              </>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-xs md:text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completa</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Incompleta</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/50" /> Sin docs</span>
          {unsynced > 0 && (
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-700" /> Sin sync</span>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, subtitle, color }: {
  icon: ReactNode
  label: string
  value: number
  subtitle?: string
  color: typeof COLORS.total
}) {
  return (
    <div className={`rounded-2xl border border-border-subtle ${color.bg} p-4 transition-all hover:scale-[1.02]`}>
      <div className={`${color.icon} mb-2`}>{icon}</div>
      <p className={`text-2xl font-bold ${color.text} tabular-nums`}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs md:text-[11px] text-text-muted font-medium">{label}</p>
        {subtitle && (
          <span className={`text-xs md:text-[10px] font-bold ${color.text} opacity-70`}>{subtitle}</span>
        )}
      </div>
    </div>
  )
}
