'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { getActiveUser } from '@/lib/supabase/active-user'
import type { Tables } from '@/lib/supabase/types'
import { DEFAULT_PIPELINES } from '@/lib/pipelines/pipeline-seed'

// Shown when the Supabase Auth session can't be resolved (lapsed/refresh failed)
// while loading pipelines. Distinct from "no pipelines exist": an empty array
// must NOT be treated as truth when auth is the real failure.
export const PIPELINES_AUTH_ERROR = 'No pudimos cargar tus procesos comerciales. Tu sesión pudo haber caducado.'

export type Pipeline = Tables<'pipelines'>
export type PipelineStage = Tables<'pipeline_stages'>

interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[]
}

interface PipelinesState {
  pipelines: PipelineWithStages[]
  activePipelineId: string | null
  loading: boolean
  initialized: boolean
  seeding: boolean
  /** Background refetch in progress (realtime). Never blanks the UI. */
  refreshing: boolean
  /** Load failure surfaced to the UI (auth lapse / query error). null = ok. */
  error: string | null

  activePipeline: () => PipelineWithStages | null
  activeStages: () => PipelineStage[]

  reset: () => void
  init: () => Promise<void>
  refresh: () => Promise<void>
  setActivePipeline: (id: string) => void

  createPipeline: (name: string, emoji?: string) => Promise<Pipeline | null>
  updatePipeline: (id: string, updates: Partial<Pick<Pipeline, 'name' | 'emoji' | 'position' | 'is_archived'>>) => Promise<void>
  deletePipeline: (id: string) => Promise<void>

  createStage: (pipelineId: string, name: string, position: number, color?: string, emoji?: string) => Promise<void>
  updateStage: (id: string, updates: Partial<Pick<PipelineStage, 'name' | 'emoji' | 'color' | 'position' | 'sla_days'>>) => Promise<void>
  deleteStage: (id: string) => Promise<void>
  reorderStages: (pipelineId: string, orderedIds: string[]) => Promise<void>
  seedDefaultPipelines: () => Promise<void>
}

const supabase = createClient()

// Fetch this owner's pipelines + stages. Returns null on auth/query failure so
// the caller can distinguish "failed" from "genuinely empty" ([] with ok:true).
async function fetchPipelinesForUser(userId: string): Promise<PipelineWithStages[] | null> {
  const { data: pipelines, error: pErr } = await supabase
    .from('pipelines')
    .select('*')
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .order('position')

  const { data: stages, error: sErr } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('owner_id', userId)
    .order('position')

  if (pErr) console.error('pipelinesStore: pipelines query failed', pErr)
  if (sErr) console.error('pipelinesStore: stages query failed', sErr)
  if (pErr || sErr || !pipelines || !stages) return null

  return pipelines.map(p => ({
    ...p,
    stages: stages.filter(s => s.pipeline_id === p.id),
  }))
}

// Debounce realtime bursts so a flurry of row changes triggers one refetch.
let refreshTimer: ReturnType<typeof setTimeout> | null = null

export const usePipelinesStore = create<PipelinesState>((set, get) => ({
  pipelines: [],
  activePipelineId: null,
  loading: true,
  initialized: false,
  seeding: false,
  refreshing: false,
  error: null,

  activePipeline: () => {
    const { pipelines, activePipelineId } = get()
    return pipelines.find(p => p.id === activePipelineId) ?? null
  },

  activeStages: () => {
    const pipeline = get().activePipeline()
    if (!pipeline) return []
    return [...pipeline.stages].sort((a, b) => a.position - b.position)
  },

  reset: () => {
    set({ pipelines: [], activePipelineId: null, loading: true, initialized: false, refreshing: false, error: null })
  },

  init: async () => {
    if (get().seeding) return
    if (get().initialized) return
    set({ initialized: true, loading: true, error: null })

    const { user, refreshFailed } = await getActiveUser(supabase)
    if (!user) {
      // Supabase session lapsed (NOT "no pipelines"). Keep any prior data,
      // surface the error, and allow a manual retry (init() runs again).
      // warn (no error): condición manejada con UI de reintento; console.error
      // dispararía el overlay de Next dev innecesariamente.
      console.warn('pipelinesStore: no Supabase session', { refreshFailed })
      set({ loading: false, initialized: false, error: PIPELINES_AUTH_ERROR })
      return
    }

    const withStages = await fetchPipelinesForUser(user.id)
    if (withStages === null) {
      // Query/RLS error — do not collapse to an empty board. Show retry.
      set({ loading: false, initialized: false, error: PIPELINES_AUTH_ERROR })
      return
    }

    if (withStages.length === 0) {
      // Genuinely empty: offer the manual seed button (UI). No auto-reseed —
      // the old `!matchesSeed` branch wiped customised pipelines on every init.
      set({ pipelines: [], activePipelineId: null, loading: false, error: null })
    } else {
      const stored = typeof window !== 'undefined'
        ? localStorage.getItem('active-pipeline-id')
        : null
      const activeId = (stored && withStages.some(p => p.id === stored))
        ? stored
        : withStages[0]?.id ?? null

      set({ pipelines: withStages, activePipelineId: activeId, loading: false, error: null })
    }

    supabase.removeChannel(supabase.channel('pipelines-realtime'))
    supabase
      .channel('pipelines-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pipelines',
      }, () => { get().refresh() })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pipeline_stages',
      }, () => { get().refresh() })
      .subscribe()
  },

  // Silent background refetch driven by realtime. Never touches `loading`/
  // `initialized` (so the board never flips to the skeleton) and only swaps
  // data on success — a transient auth/query failure leaves the UI intact.
  refresh: async () => {
    if (get().seeding || get().refreshing) return
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(async () => {
      set({ refreshing: true })
      try {
        const { user } = await getActiveUser(supabase)
        if (!user) return
        const withStages = await fetchPipelinesForUser(user.id)
        if (withStages === null) return
        const current = get().activePipelineId
        const activeId = (current && withStages.some(p => p.id === current))
          ? current
          : withStages[0]?.id ?? null
        set({ pipelines: withStages, activePipelineId: activeId, error: null })
      } finally {
        set({ refreshing: false })
      }
    }, 300)
  },

  setActivePipeline: (id) => {
    set({ activePipelineId: id })
    localStorage.setItem('active-pipeline-id', id)
  },

  createPipeline: async (name, emoji) => {
    const { user } = await getActiveUser(supabase)
    if (!user) return null

    const position = get().pipelines.length
    const { data, error } = await supabase
      .from('pipelines')
      .insert({ name, emoji: emoji ?? null, owner_id: user.id, position })
      .select()
      .single()

    if (error || !data) return null

    set(s => ({
      pipelines: [...s.pipelines, { ...data, stages: [] }],
    }))
    return data
  },

  updatePipeline: async (id, updates) => {
    await supabase.from('pipelines').update(updates).eq('id', id)
    set(s => ({
      pipelines: s.pipelines.map(p => p.id === id ? { ...p, ...updates } : p),
    }))
  },

  deletePipeline: async (id) => {
    await supabase.from('pipelines').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    set(s => {
      const remaining = s.pipelines.filter(p => p.id !== id)
      return {
        pipelines: remaining,
        activePipelineId: s.activePipelineId === id
          ? remaining[0]?.id ?? null
          : s.activePipelineId,
      }
    })
  },

  createStage: async (pipelineId, name, position, color, emoji) => {
    const { user } = await getActiveUser(supabase)
    if (!user) return

    const { data } = await supabase
      .from('pipeline_stages')
      .insert({
        pipeline_id: pipelineId,
        owner_id: user.id,
        name,
        position,
        color: color ?? '#3b82f6',
        emoji: emoji ?? null,
      })
      .select()
      .single()

    if (!data) return

    set(s => ({
      pipelines: s.pipelines.map(p =>
        p.id === pipelineId
          ? { ...p, stages: [...p.stages, data] }
          : p
      ),
    }))
  },

  updateStage: async (id, updates) => {
    await supabase.from('pipeline_stages').update(updates).eq('id', id)
    set(s => ({
      pipelines: s.pipelines.map(p => ({
        ...p,
        stages: p.stages.map(st => st.id === id ? { ...st, ...updates } : st),
      })),
    }))
  },

  deleteStage: async (id) => {
    await supabase.from('pipeline_stages').delete().eq('id', id)
    set(s => ({
      pipelines: s.pipelines.map(p => ({
        ...p,
        stages: p.stages.filter(st => st.id !== id),
      })),
    }))
  },

  reorderStages: async (pipelineId, orderedIds) => {
    const updates = orderedIds.map((id, i) => ({ id, position: i }))

    set(s => ({
      pipelines: s.pipelines.map(p => {
        if (p.id !== pipelineId) return p
        return {
          ...p,
          stages: p.stages.map(st => {
            const idx = orderedIds.indexOf(st.id)
            return idx >= 0 ? { ...st, position: idx } : st
          }),
        }
      }),
    }))

    for (const u of updates) {
      await supabase.from('pipeline_stages').update({ position: u.position }).eq('id', u.id)
    }
  },

  seedDefaultPipelines: async () => {
    const { user } = await getActiveUser(supabase)
    if (!user) return

    // 1. Delete all contact-pipeline associations for this user to avoid FK constraint errors
    await supabase.from('contact_pipelines').delete().eq('owner_id', user.id)

    // 2. Delete all stages for this user
    await supabase.from('pipeline_stages').delete().eq('owner_id', user.id)

    // 3. Soft-delete all active pipelines for this user
    await supabase
      .from('pipelines')
      .update({ deleted_at: new Date().toISOString() })
      .eq('owner_id', user.id)
      .is('deleted_at', null)

    // 4. Create new pipelines + stages from seed
    const newPipelines: PipelineWithStages[] = []

    for (const seed of DEFAULT_PIPELINES) {
      const { data: pipeline } = await supabase
        .from('pipelines')
        .insert({
          name: seed.name,
          emoji: seed.emoji,
          owner_id: user.id,
          position: seed.position,
        })
        .select()
        .single()

      if (!pipeline) continue

      const stagesData: PipelineStage[] = []

      for (const stageSeed of seed.stages) {
        const { data: stage } = await supabase
          .from('pipeline_stages')
          .insert({
            pipeline_id: pipeline.id,
            owner_id: user.id,
            name: stageSeed.name,
            emoji: stageSeed.emoji,
            color: stageSeed.color,
            position: stageSeed.position,
            sla_days: stageSeed.sla_days ?? null,
          })
          .select()
          .single()

        if (stage) stagesData.push(stage)
      }

      newPipelines.push({ ...pipeline, stages: stagesData })
    }

    set({
      pipelines: newPipelines,
      activePipelineId: newPipelines[0]?.id ?? null,
      loading: false,
      initialized: true,
      error: null,
    })

    if (newPipelines[0]) {
      localStorage.setItem('active-pipeline-id', newPipelines[0].id)
    }
  },
}))
