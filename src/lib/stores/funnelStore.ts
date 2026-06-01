import { create } from "zustand"
import type { FunnelStage, Period } from "@/lib/embudo/funnel"
import { toISODate } from "@/lib/embudo/funnel"

export interface FunnelActivity {
  id: string
  agent_email: string
  stage: FunnelStage
  activity_date: string
  quantity: number
  action: string | null
  origin: string | null
  operation_type: string | null
  address_or_name: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface FunnelGoal {
  stage: FunnelStage
  monthly_target: number
  active: boolean
}

export interface ActivityInput {
  stage: FunnelStage
  activity_date: string
  quantity?: number
  action?: string | null
  origin?: string | null
  operation_type?: string | null
  address_or_name?: string | null
  note?: string | null
}

interface MutationResult { ok: boolean; error?: string }

interface FunnelState {
  activities: FunnelActivity[]
  goals: FunnelGoal[]
  period: Period
  refDate: string // yyyy-MM-dd anchor inside the active period
  loading: boolean
  initialized: boolean

  init: () => Promise<void>
  refresh: () => Promise<void>
  setPeriod: (p: Period) => Promise<void>
  setRefDate: (d: string) => Promise<void>
  addActivity: (input: ActivityInput) => Promise<MutationResult>
  updateActivity: (id: string, input: ActivityInput) => Promise<MutationResult>
  deleteActivity: (id: string) => Promise<MutationResult>
  goalFor: (stage: FunnelStage) => number
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.error ?? "Error inesperado"
  } catch {
    return "Error inesperado"
  }
}

export const useFunnelStore = create<FunnelState>()((set, get) => ({
  activities: [],
  goals: [],
  period: "week",
  refDate: toISODate(new Date()),
  loading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })
    // Goals are period-independent — fetch once.
    try {
      const res = await fetch("/api/embudo/goals")
      if (res.ok) {
        const body = await res.json()
        set({ goals: body.data ?? [] })
      }
    } catch { /* non-fatal */ }
    await get().refresh()
  },

  refresh: async () => {
    const { period, refDate } = get()
    set({ loading: true })
    try {
      const res = await fetch(`/api/embudo/activities?period=${period}&date=${refDate}`)
      if (res.ok) {
        const body = await res.json()
        set({ activities: body.data ?? [] })
      }
    } catch { /* non-fatal */ }
    set({ loading: false })
  },

  setPeriod: async (p) => {
    if (get().period === p) return
    set({ period: p })
    await get().refresh()
  },

  setRefDate: async (d) => {
    if (get().refDate === d) return
    set({ refDate: d })
    await get().refresh()
  },

  addActivity: async (input) => {
    try {
      const res = await fetch("/api/embudo/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return { ok: false, error: await readError(res) }
      const body = await res.json()
      const created = body.data as FunnelActivity
      // Add only if it falls in the visible range; otherwise just resync.
      const { activities } = get()
      set({ activities: [created, ...activities] })
      await get().refresh()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error de red" }
    }
  },

  updateActivity: async (id, input) => {
    try {
      const res = await fetch(`/api/embudo/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return { ok: false, error: await readError(res) }
      const body = await res.json()
      const updated = body.data as FunnelActivity
      set({ activities: get().activities.map(a => a.id === id ? updated : a) })
      await get().refresh()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error de red" }
    }
  },

  deleteActivity: async (id) => {
    // Optimistic removal.
    const prev = get().activities
    set({ activities: prev.filter(a => a.id !== id) })
    try {
      const res = await fetch(`/api/embudo/activities/${id}`, { method: "DELETE" })
      if (!res.ok) {
        set({ activities: prev }) // rollback
        return { ok: false, error: await readError(res) }
      }
      return { ok: true }
    } catch (e) {
      set({ activities: prev })
      return { ok: false, error: e instanceof Error ? e.message : "Error de red" }
    }
  },

  goalFor: (stage) => {
    const g = get().goals.find(x => x.stage === stage)
    return g ? Number(g.monthly_target) : 0
  },
}))
