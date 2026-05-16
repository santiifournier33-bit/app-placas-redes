"use client"

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/nav/PageHeader"
import { format, startOfWeek } from "date-fns"
import { Users, CheckSquare, UserPlus, ArrowRightLeft, AlertTriangle } from "lucide-react"
import { WeekSelector } from "@/components/productividad/WeekSelector"
import { createClient } from "@/lib/supabase/client"

interface AgentMetrics {
  profile_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  tasks_completed: number
  contacts_created: number
  contacts_moved: number
  total_actions: number
}

type SortKey = "total_actions" | "tasks_completed" | "contacts_created" | "contacts_moved"

export function ReunionLunesView() {
  const [weekKey, setWeekKey] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  )
  const [agents, setAgents] = useState<AgentMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>("total_actions")

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase.rpc("get_team_week_metrics" as string as never, {
        week_start: weekKey,
      } as never) as unknown as { data: AgentMetrics[] | null; error: unknown }
      if (!cancelled) {
        setAgents(error ? [] : (data as AgentMetrics[]) ?? [])
        setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [weekKey])

  const sorted = useMemo(
    () => [...agents].sort((a, b) => b[sortBy] - a[sortBy]),
    [agents, sortBy]
  )

  const totals = useMemo(() => ({
    tasks_completed: agents.reduce((s, a) => s + a.tasks_completed, 0),
    contacts_created: agents.reduce((s, a) => s + a.contacts_created, 0),
    contacts_moved: agents.reduce((s, a) => s + a.contacts_moved, 0),
    total_actions: agents.reduce((s, a) => s + a.total_actions, 0),
  }), [agents])

  const inactive = useMemo(
    () => agents.filter(a => a.total_actions === 0),
    [agents]
  )

  return (
    <div>
      <PageHeader title="Equipo" />
      <div className="max-w-3xl mx-auto">
        <WeekSelector weekKey={weekKey} onChange={setWeekKey} />

      {loading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-5">
          {/* KPI summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={<CheckSquare size={18} strokeWidth={1.8} />}
              label="Tareas completadas"
              value={totals.tasks_completed}
              color="violet"
            />
            <SummaryCard
              icon={<UserPlus size={18} strokeWidth={1.8} />}
              label="Contactos creados"
              value={totals.contacts_created}
              color="blue"
            />
            <SummaryCard
              icon={<ArrowRightLeft size={18} strokeWidth={1.8} />}
              label="Movimientos pipeline"
              value={totals.contacts_moved}
              color="emerald"
            />
            <SummaryCard
              icon={<Users size={18} strokeWidth={1.8} />}
              label="Acciones totales"
              value={totals.total_actions}
              color="amber"
            />
          </div>

          {/* Ranking table */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ranking semanal</h3>
            </div>

            {agents.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">Sin datos para esta semana</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="text-left px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Agente</th>
                      <SortHeader label="Tareas" sortKey="tasks_completed" current={sortBy} onSort={setSortBy} />
                      <SortHeader label="Contactos" sortKey="contacts_created" current={sortBy} onSort={setSortBy} />
                      <SortHeader label="Movimientos" sortKey="contacts_moved" current={sortBy} onSort={setSortBy} />
                      <SortHeader label="Total" sortKey="total_actions" current={sortBy} onSort={setSortBy} />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((agent, i) => (
                      <tr
                        key={agent.profile_id}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold tabular-nums ${
                            i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-400" : i === 2 ? "text-orange-400" : "text-zinc-600"
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center text-[11px] font-bold text-blue-400 shrink-0">
                              {(agent.display_name || agent.email)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-shell-text truncate">
                                {agent.display_name || agent.email.split("@")[0]}
                              </p>
                              <p className="text-[10px] text-zinc-600 truncate">{agent.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-300 tabular-nums text-center">{agent.tasks_completed}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-300 tabular-nums text-center">{agent.contacts_created}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-300 tabular-nums text-center">{agent.contacts_moved}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs font-bold text-shell-text tabular-nums">{agent.total_actions}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* No-activity alerts */}
          {inactive.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Sin actividad esta semana
                </span>
              </div>
              <div className="space-y-2">
                {inactive.map(a => (
                  <div key={a.profile_id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center text-[9px] font-bold text-amber-400 shrink-0">
                      {(a.display_name || a.email)[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-zinc-400">
                      {a.display_name || a.email.split("@")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

const CARD_COLORS = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400/70" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "text-emerald-400/70" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-400/70" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", icon: "text-violet-400/70" },
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color: keyof typeof CARD_COLORS
}) {
  const c = CARD_COLORS[color]
  return (
    <div className={`rounded-2xl border border-white/[0.06] ${c.bg} p-4`}>
      <div className={`${c.icon} mb-2`}>{icon}</div>
      <p className={`text-2xl font-bold ${c.text} tabular-nums`}>{value}</p>
      <p className="text-[11px] text-zinc-500 font-medium mt-1">{label}</p>
    </div>
  )
}

function SortHeader({ label, sortKey, current, onSort }: {
  label: string
  sortKey: SortKey
  current: SortKey
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th
      className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer select-none transition-colors ${
        active ? "text-blue-400" : "text-zinc-600 hover:text-zinc-400"
      }`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && " ↓"}
    </th>
  )
}
