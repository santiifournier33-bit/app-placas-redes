"use client"

import { Search, Filter, X } from "lucide-react"
import type { PropertyStatus } from "@/lib/docs/doc-requirements"

interface DocFiltersProps {
  agents: string[]
  selectedAgent: string | null
  selectedStatus: PropertyStatus | null
  searchQuery: string
  onAgentChange: (agent: string | null) => void
  onStatusChange: (status: PropertyStatus | null) => void
  onSearchChange: (query: string) => void
}

const STATUS_OPTIONS: { value: PropertyStatus; label: string; emoji: string }[] = [
  { value: "complete", label: "Completa", emoji: "✅" },
  { value: "incomplete", label: "Incompleta", emoji: "🟠" },
  { value: "missing", label: "Sin docs", emoji: "🔴" },
  { value: "unsynced", label: "Sin sync", emoji: "⚪" },
]

export function DocFilters({
  agents,
  selectedAgent,
  selectedStatus,
  searchQuery,
  onAgentChange,
  onStatusChange,
  onSearchChange,
}: DocFiltersProps) {
  const hasFilters = selectedAgent || selectedStatus || searchQuery

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Agent filter */}
      <div className="relative">
        <select
          value={selectedAgent || ""}
          onChange={e => onAgentChange(e.target.value || null)}
          className="appearance-none bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 pr-8 text-sm text-shell-text cursor-pointer hover:bg-white/[0.06] transition-colors focus:outline-none focus:border-blue-500/30 [color-scheme:dark]"
        >
          <option value="" className="bg-zinc-900 text-white">Todos los asesores</option>
          {agents.map(a => (
            <option key={a} value={a} className="bg-zinc-900 text-white">{a}</option>
          ))}
        </select>
        <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      </div>

      {/* Status filter */}
      <div className="relative">
        <select
          value={selectedStatus || ""}
          onChange={e => onStatusChange((e.target.value as PropertyStatus) || null)}
          className="appearance-none bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 pr-8 text-sm text-shell-text cursor-pointer hover:bg-white/[0.06] transition-colors focus:outline-none focus:border-blue-500/30 [color-scheme:dark]"
        >
          <option value="" className="bg-zinc-900 text-white">Todos los estados</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value} className="bg-zinc-900 text-white">{s.emoji} {s.label}</option>
          ))}
        </select>
        <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar por ID, dirección, asesor..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-sm text-shell-text placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/30 transition-colors"
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => {
            onAgentChange(null)
            onStatusChange(null)
            onSearchChange("")
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <X size={12} />
          Limpiar
        </button>
      )}
    </div>
  )
}
