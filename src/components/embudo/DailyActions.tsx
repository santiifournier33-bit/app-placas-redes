"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { startOfWeek, addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import {
  FUNNEL_STAGES, STAGE_META, toISODate, WORKDAYS_PER_WEEK,
  weeklyTargetInt, workdayIndex, dailyTargetForDay, type FunnelStage,
} from "@/lib/embudo/funnel"
import { useFunnelStore, type FunnelActivity } from "@/lib/stores/funnelStore"

function sumFor(items: FunnelActivity[], date: string, stage: FunnelStage): number {
  return items
    .filter(a => a.activity_date === date && a.stage === stage)
    .reduce((acc, a) => acc + (Number(a.quantity) || 1), 0)
}

/**
 * "Tu día" — lightweight daily action tracker derived from the weekly funnel
 * goals. Shows today's quota per high-frequency stage, an overall progress bar,
 * and what was left unmet yesterday. Read-only/derived: no extra persistence.
 */
export function DailyActions() {
  const router = useRouter()
  const { goalFor, init } = useFunnelStore()
  const [items, setItems] = useState<FunnelActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [init])

  // Fetch the current week (Mon–Sun) once: it contains today plus every prior
  // workday this week, which is exactly what the daily quota and the week-to-date
  // deficit need — and it resets naturally each Monday.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/embudo/activities?period=week&date=${toISODate(new Date())}`)
        if (res.ok && !cancelled) {
          const body = await res.json()
          setItems(body.data ?? [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const today = new Date()
  const todayISO = toISODate(today)
  const todayIdx = workdayIndex(today)        // 0=Mon … 4=Fri, null on weekend

  // Stages that carry a meaningful daily quota today (≥1). The weekly target is
  // split across Mon–Fri so the five days sum exactly to it (no overshoot).
  // Low-frequency stages (tasación/captación/reserva/venta) round to 0/day and
  // are tracked weekly/monthly, not here.
  const rows = useMemo(() => {
    if (todayIdx === null) return []
    return FUNNEL_STAGES
      .map(stage => {
        const target = dailyTargetForDay(weeklyTargetInt(goalFor(stage)), todayIdx)
        const done = sumFor(items, todayISO, stage)
        return { stage, target, done }
      })
      .filter(r => r.target >= 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, todayISO, todayIdx])

  // Week-to-date deficit: the gap between what was expected from Monday up to
  // yesterday and what was actually logged. Resets every Monday (no prior
  // workdays this week → empty), so last week's shortfall never carries over.
  const pendingWeek = useMemo(() => {
    const priorWorkdays = todayIdx === null ? WORKDAYS_PER_WEEK : todayIdx
    if (priorWorkdays <= 0) return [] // Monday → counter back to zero
    const start = startOfWeek(today, { weekStartsOn: 1 })
    return FUNNEL_STAGES
      .map(stage => {
        const weekly = weeklyTargetInt(goalFor(stage))
        let expected = 0
        let done = 0
        for (let i = 0; i < priorWorkdays; i++) {
          expected += dailyTargetForDay(weekly, i)
          done += sumFor(items, toISODate(addDays(start, i)), stage)
        }
        return { stage, missing: Math.max(0, expected - done) }
      })
      .filter(r => r.missing > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, todayISO, todayIdx])

  const totalTarget = rows.reduce((a, r) => a + r.target, 0)
  const totalDone = rows.reduce((a, r) => a + Math.min(r.done, r.target), 0)
  const percent = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0
  const allDone = totalTarget > 0 && totalDone >= totalTarget

  const dateLabel = format(today, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1/50 backdrop-blur-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">Tu día</h3>
          <p className="text-[11px] text-text-muted capitalize mt-0.5">{dateLabel}</p>
        </div>
        <button
          onClick={() => router.push("/embudo?tab=tracker")}
          className="text-xs md:text-[10px] text-brand-accent hover:underline font-bold uppercase tracking-wider cursor-pointer"
        >
          Cargar
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-8 bg-surface-overlay rounded-lg animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        pendingWeek.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-text-muted">
            <CheckCircle2 size={22} className="mb-2 text-emerald-400" />
            <p className="text-xs font-medium">Estás al día</p>
          </div>
        ) : null
      ) : (
        <>
          {/* Overall progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-text-muted uppercase tracking-wider">Progreso del día</span>
              <span className={allDone ? "text-emerald-400" : "text-text-secondary"}>{totalDone}/{totalTarget}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-overlay overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${allDone ? "bg-emerald-500" : "bg-shell-accent"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Per-stage daily quota */}
          <div className="space-y-1.5">
            {rows.map(({ stage, target, done }) => {
              const met = done >= target
              const meta = STAGE_META[stage]
              return (
                <button
                  key={stage}
                  onClick={() => router.push("/embudo?tab=tracker")}
                  className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-surface-2/80 transition-colors cursor-pointer text-left"
                >
                  {met
                    ? <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />
                    : <Circle size={17} className="shrink-0" style={{ color: meta.color }} />}
                  <span className="flex-1 text-[13px] text-text-primary truncate">{meta.label}</span>
                  <span className={`text-xs font-semibold tabular-nums ${met ? "text-emerald-400" : "text-text-muted"}`}>
                    {done}/{target}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Week-to-date deficit (resets each Monday) */}
      {!loading && pendingWeek.length > 0 && (
        <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle size={14} className="text-brand-accent" />
            <span className="text-[11px] font-bold text-brand-accent uppercase tracking-wider">Pendiente esta semana</span>
          </div>
          <p className="text-[11px] text-text-secondary pl-5">
            {pendingWeek.map(p => `${p.missing} ${STAGE_META[p.stage].label.toLowerCase()}`).join(" · ")}
          </p>
        </div>
      )}
    </div>
  )
}
