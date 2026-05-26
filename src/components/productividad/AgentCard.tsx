"use client"

import { CheckSquare, UserPlus, ArrowRightLeft } from "lucide-react"
import type { AgentWeekData } from "@/lib/stores/teamStore"

interface AgentCardProps {
  data: AgentWeekData
  rank: number
  onTap?: () => void
}

export function AgentCard({ data, rank, onTap }: AgentCardProps) {
  const { agent, metrics } = data
  const active = metrics.totalActions > 0

  return (
    <div
      onClick={onTap}
      className={`flex items-center gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-overlay transition-colors ${onTap ? "cursor-pointer" : ""}`}
    >
      {/* Rank */}
      <span className={`w-6 text-center text-sm font-bold tabular-nums ${
        rank === 1 ? "text-amber-400" :
        rank === 2 ? "text-text-secondary" :
        rank === 3 ? "text-orange-400" :
        "text-text-muted"
      }`}>
        {rank}
      </span>

      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        active ? "bg-blue-500/15 text-blue-400" : "bg-zinc-800 text-text-muted"
      }`}>
        {agent.displayName.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{agent.displayName}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs md:text-[11px] text-text-muted">
            <CheckSquare size={11} /> {metrics.tasksCompleted}
          </span>
          <span className="flex items-center gap-1 text-xs md:text-[11px] text-text-muted">
            <UserPlus size={11} /> {metrics.leadsCreated}
          </span>
          <span className="flex items-center gap-1 text-xs md:text-[11px] text-text-muted">
            <ArrowRightLeft size={11} /> {metrics.leadsMoved}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="text-right shrink-0">
        <p className={`text-lg font-bold tabular-nums ${active ? "text-text-primary" : "text-zinc-700"}`}>
          {metrics.totalActions}
        </p>
        <p className="text-xs md:text-[10px] text-text-muted">acciones</p>
      </div>

      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${
        active ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-zinc-700"
      }`} />
    </div>
  )
}
