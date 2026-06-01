"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Trophy, AlertTriangle } from "lucide-react"
import { addWeeks, addMonths, startOfWeek, endOfWeek, format } from "date-fns"
import { es } from "date-fns/locale"
import {
  FUNNEL_STAGES, STAGE_META, displayTarget, pct, toISODate, type FunnelStage,
} from "@/lib/embudo/funnel"
import { useFunnelStore, type FunnelGoal } from "@/lib/stores/funnelStore"
import { PeriodToggle } from "./PeriodToggle"

interface LeaderRow {
  email: string
  name: string | null
  counts: Record<FunnelStage, number>
}

interface LeaderboardProps {
  variant?: "full" | "mini"
}

type SortKey = "overall" | FunnelStage

export function Leaderboard({ variant = "full" }: LeaderboardProps) {
  const { period, refDate, setRefDate } = useFunnelStore()
  const [rows, setRows] = useState<LeaderRow[]>([])
  const [goals, setGoals] = useState<FunnelGoal[]>([])
  const [me, setMe] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>("overall")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/embudo/leaderboard?period=${period}&date=${refDate}`)
        if (res.ok && !cancelled) {
          const body = await res.json()
          setRows(body.data ?? [])
          setGoals(body.goals ?? [])
          setMe(body.me ?? "")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [period, refDate])

  const monthlyOf = useMemo(() => {
    const map = {} as Record<FunnelStage, number>
    for (const s of FUNNEL_STAGES) map[s] = Number(goals.find(g => g.stage === s)?.monthly_target ?? 0)
    return map
  }, [goals])

  function overallPct(counts: Record<FunnelStage, number>): number {
    const stagesWithGoal = FUNNEL_STAGES.filter(s => monthlyOf[s] > 0)
    if (stagesWithGoal.length === 0) return 0
    const sum = stagesWithGoal.reduce((acc, s) => acc + pct(counts[s], monthlyOf[s], period), 0)
    return Math.round(sum / stagesWithGoal.length)
  }

  const ranked = useMemo(() => {
    const withScore = rows.map(r => ({ ...r, overall: overallPct(r.counts) }))
    return withScore.sort((a, b) => {
      if (sortBy === "overall") return b.overall - a.overall
      return b.counts[sortBy] - a.counts[sortBy]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortBy, monthlyOf, period])

  function shiftPeriod(dir: number) {
    const ref = new Date(`${refDate}T12:00:00`)
    const next = period === "week" ? addWeeks(ref, dir) : addMonths(ref, dir)
    setRefDate(toISODate(next))
  }

  const periodLabel = (() => {
    const ref = new Date(`${refDate}T12:00:00`)
    if (period === "week") {
      const s = startOfWeek(ref, { weekStartsOn: 1 })
      const e = endOfWeek(ref, { weekStartsOn: 1 })
      return `${format(s, "d MMM", { locale: es })} – ${format(e, "d MMM", { locale: es })}`
    }
    return format(ref, "MMMM yyyy", { locale: es })
  })()

  // ── Mini variant (dashboard): top 3 + you ──────────────────────────────
  if (variant === "mini") {
    const top = ranked.slice(0, 3)
    const myRow = ranked.find(r => r.email === me)
    const myRank = ranked.findIndex(r => r.email === me) + 1
    const showMe = myRow && myRank > 3
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-1/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
            <Trophy size={13} className="text-shell-accent" /> Ranking
          </h3>
          <span className="text-[10px] text-text-muted capitalize">{periodLabel}</span>
        </div>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-9 bg-surface-overlay rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="space-y-1">
            {top.map((r, i) => <MiniRow key={r.email} rank={i + 1} row={r} overall={r.overall} isMe={r.email === me} />)}
            {showMe && (
              <>
                <div className="text-center text-text-muted text-xs py-0.5">···</div>
                <MiniRow rank={myRank} row={myRow!} overall={myRow!.overall} isMe />
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Full variant (module tab) ───────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodToggle />
        <div className="flex items-center gap-2">
          <button onClick={() => shiftPeriod(-1)} className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-overlay-hover text-text-muted cursor-pointer" aria-label="Anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary capitalize min-w-[140px] text-center">{periodLabel}</span>
          <button onClick={() => shiftPeriod(1)} className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-overlay-hover text-text-muted cursor-pointer" aria-label="Siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1/50 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-surface-overlay rounded-xl animate-pulse" />)}</div>
        ) : ranked.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-10">Sin datos para este período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">#</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Asesor</th>
                  {FUNNEL_STAGES.map(s => (
                    <SortHeader key={s} label={STAGE_META[s].short} sortKey={s} current={sortBy} onSort={setSortBy} />
                  ))}
                  <SortHeader label="% Global" sortKey="overall" current={sortBy} onSort={setSortBy} />
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => {
                  const isMe = r.email === me
                  return (
                    <tr key={r.email} className={`border-b border-white/[0.03] transition-colors ${isMe ? "bg-shell-accent/5" : "hover:bg-surface-overlay"}`}>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-bold tabular-nums ${i === 0 ? "text-amber-400" : i === 1 ? "text-text-secondary" : i === 2 ? "text-orange-400" : "text-text-muted"}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-shell-accent/15 flex items-center justify-center text-[11px] font-bold text-shell-accent shrink-0">
                            {(r.name || r.email)[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-text-primary truncate">
                            {r.name || r.email.split("@")[0]}{isMe && " (vos)"}
                          </span>
                        </div>
                      </td>
                      {FUNNEL_STAGES.map(s => {
                        const denom = displayTarget(monthlyOf[s], period)
                        const p = pct(r.counts[s], monthlyOf[s], period)
                        return (
                          <td key={s} className="px-3 py-2.5 text-center">
                            <span className="text-xs font-semibold tabular-nums" style={{ color: pctColor(p) }}>
                              {r.counts[s]}{denom !== null ? `/${denom}` : ""}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-bold tabular-nums" style={{ color: pctColor(r.overall) }}>{r.overall}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && ranked.some(r => r.overall === 0) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <span className="text-xs text-text-secondary">
            {ranked.filter(r => r.overall === 0).map(r => r.name || r.email.split("@")[0]).join(", ")} sin actividad este período.
          </span>
        </div>
      )}
    </div>
  )
}

function MiniRow({ rank, row, overall, isMe }: { rank: number; row: LeaderRow; overall: number; isMe: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg ${isMe ? "bg-shell-accent/10" : ""}`}>
      <span className={`text-xs font-bold tabular-nums w-4 text-center ${rank === 1 ? "text-amber-400" : rank === 2 ? "text-text-secondary" : rank === 3 ? "text-orange-400" : "text-text-muted"}`}>{rank}</span>
      <div className="w-6 h-6 rounded-full bg-shell-accent/15 flex items-center justify-center text-[10px] font-bold text-shell-accent shrink-0">
        {(row.name || row.email)[0].toUpperCase()}
      </div>
      <span className="text-xs font-medium text-text-primary flex-1 truncate">
        {row.name || row.email.split("@")[0]}{isMe && " (vos)"}
      </span>
      <span className="text-xs font-bold tabular-nums" style={{ color: pctColor(overall) }}>{overall}%</span>
    </div>
  )
}

function SortHeader({ label, sortKey, current, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th
      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer select-none transition-colors ${active ? "text-shell-accent" : "text-text-muted hover:text-text-secondary"}`}
      onClick={() => onSort(sortKey)}
    >
      {label}{active && " ↓"}
    </th>
  )
}

function pctColor(p: number): string {
  if (p >= 100) return "#34d399"
  if (p >= 60) return "#C8A45A"
  if (p > 0) return "#fb923c"
  return "var(--text-muted)"
}
