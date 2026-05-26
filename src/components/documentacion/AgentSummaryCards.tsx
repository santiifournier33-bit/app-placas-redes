"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, User } from "lucide-react"
import type { AgentSummary } from "@/lib/docs/doc-analyzer"

interface AgentSummaryCardsProps {
  agents: AgentSummary[]
  loading?: boolean
  onAgentClick?: (agentName: string) => void
}

export function AgentSummaryCards({ agents, loading, onAgentClick }: AgentSummaryCardsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em]">Asesores</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    )
  }

  if (agents.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em]">Asesores</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map(agent => (
          <AgentCard key={agent.name} agent={agent} onClick={() => onAgentClick?.(agent.name)} />
        ))}
      </div>
    </div>
  )
}

function AgentCard({ agent, onClick }: { agent: AgentSummary; onClick: () => void }) {
  const barColor = agent.percentage >= 80
    ? "bg-emerald-500"
    : agent.percentage >= 50
      ? "bg-amber-500"
      : "bg-red-500"

  const statusColor = agent.percentage >= 80
    ? "text-emerald-400"
    : agent.percentage >= 50
      ? "text-amber-400"
      : "text-red-400"

  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-border-subtle bg-surface-overlay p-4 text-left transition-all hover:bg-surface-overlay hover:scale-[1.01] cursor-pointer active:scale-[0.99] w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-surface-overlay-hover flex items-center justify-center">
            <User size={14} strokeWidth={1.8} className="text-text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary leading-tight">{agent.name}</p>
            <p className="text-xs md:text-[11px] text-text-muted">{agent.total} propiedades</p>
          </div>
        </div>
        <span className={`text-lg font-bold tabular-nums ${statusColor}`}>
          {agent.percentage}%
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${agent.percentage}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className="flex gap-3 mt-2 text-xs md:text-[10px] text-text-muted">
        {agent.complete > 0 && <span>✅ {agent.complete}</span>}
        {agent.incomplete > 0 && <span>⚠️ {agent.incomplete}</span>}
        {(agent.missing + agent.unsynced) > 0 && <span>🔴 {agent.missing + agent.unsynced}</span>}
      </div>
    </button>
  )
}
