"use client"

import { useEffect, useState } from "react"
import { Check, Save } from "lucide-react"
import {
  FUNNEL_STAGES, STAGE_META, periodGoal, type FunnelStage,
} from "@/lib/embudo/funnel"

export function GoalsConfig() {
  const [targets, setTargets] = useState<Record<FunnelStage, string>>(
    () => FUNNEL_STAGES.reduce((acc, s) => { acc[s] = "0"; return acc }, {} as Record<FunnelStage, string>)
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/embudo/goals")
        if (res.ok && !cancelled) {
          const body = await res.json()
          const next = { ...targets }
          for (const g of body.data ?? []) next[g.stage as FunnelStage] = String(g.monthly_target)
          setTargets(next)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const goals = FUNNEL_STAGES.map(s => ({ stage: s, monthly_target: Number(targets[s]) || 0 }))
    try {
      const res = await fetch("/api/embudo/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "No se pudo guardar")
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setError("Error de red")
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="space-y-3">{FUNNEL_STAGES.map(s => <div key={s} className="h-14 bg-surface-overlay rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-text-muted">
        Objetivos <span className="font-semibold text-text-secondary">mensuales</span> globales (aplican a todos los asesores).
        La meta semanal se calcula automáticamente.
      </p>

      <div className="rounded-2xl border border-border-subtle bg-surface-1/50 divide-y divide-border-subtle">
        {FUNNEL_STAGES.map(s => {
          const meta = STAGE_META[s]
          const monthly = Number(targets[s]) || 0
          const { denom, cadence } = periodGoal(monthly, "week")
          const weeklyText = monthly <= 0 ? "sin meta" : cadence ?? `${denom}/sem`
          return (
            <div key={s} className="flex items-center gap-3 px-4 py-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{meta.label}</p>
                <p className="text-[11px] text-text-muted">
                  Semanal: {weeklyText}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={targets[s]}
                  onChange={e => setTargets(t => ({ ...t, [s]: e.target.value }))}
                  className="w-20 rounded-lg border border-border-subtle bg-surface-2/60 px-3 py-1.5 text-sm text-text-primary text-right tabular-nums outline-none focus:border-shell-accent/50 [color-scheme:dark]"
                />
                <span className="text-xs text-text-muted">/mes</span>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-shell-accent text-shell-bg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
      >
        {saved ? <><Check size={16} /> Guardado</> : saving ? "Guardando…" : <><Save size={16} /> Guardar objetivos</>}
      </button>
    </div>
  )
}
