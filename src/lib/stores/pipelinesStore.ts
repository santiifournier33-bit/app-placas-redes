'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/types'

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

  activePipeline: () => PipelineWithStages | null
  activeStages: () => PipelineStage[]

  init: () => Promise<void>
  setActivePipeline: (id: string) => void

  createPipeline: (name: string, emoji?: string) => Promise<Pipeline | null>
  updatePipeline: (id: string, updates: Partial<Pick<Pipeline, 'name' | 'emoji' | 'position' | 'is_archived'>>) => Promise<void>
  deletePipeline: (id: string) => Promise<void>

  createStage: (pipelineId: string, name: string, position: number, color?: string, emoji?: string) => Promise<void>
  updateStage: (id: string, updates: Partial<Pick<PipelineStage, 'name' | 'emoji' | 'color' | 'position' | 'sla_days'>>) => Promise<void>
  deleteStage: (id: string) => Promise<void>
  reorderStages: (pipelineId: string, orderedIds: string[]) => Promise<void>
}

const supabase = createClient()

export const usePipelinesStore = create<PipelinesState>((set, get) => ({
  pipelines: [],
  activePipelineId: null,
  loading: true,
  initialized: false,

  activePipeline: () => {
    const { pipelines, activePipelineId } = get()
    return pipelines.find(p => p.id === activePipelineId) ?? null
  },

  activeStages: () => {
    const pipeline = get().activePipeline()
    if (!pipeline) return []
    return [...pipeline.stages].sort((a, b) => a.position - b.position)
  },

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const { data: pipelines, error: pErr } = await supabase
      .from('pipelines')
      .select('*')
      .is('deleted_at', null)
      .order('position')

    const { data: stages, error: sErr } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('position')

    if (pErr) console.error('pipelinesStore: pipelines query failed', pErr)
    if (sErr) console.error('pipelinesStore: stages query failed', sErr)

    if (!pipelines || !stages) {
      set({ loading: false, initialized: true })
      return
    }

    const withStages: PipelineWithStages[] = pipelines.map(p => ({
      ...p,
      stages: stages.filter(s => s.pipeline_id === p.id),
    }))

    const stored = typeof window !== 'undefined'
      ? localStorage.getItem('active-pipeline-id')
      : null
    const activeId = (stored && withStages.some(p => p.id === stored))
      ? stored
      : withStages[0]?.id ?? null

    set({
      pipelines: withStages,
      activePipelineId: activeId,
      loading: false,
    })

    supabase.removeChannel(supabase.channel('pipelines-realtime'))
    supabase
      .channel('pipelines-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pipelines',
      }, () => { get().init() })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pipeline_stages',
      }, () => { get().init() })
      .subscribe()
  },

  setActivePipeline: (id) => {
    set({ activePipelineId: id })
    localStorage.setItem('active-pipeline-id', id)
  },

  createPipeline: async (name, emoji) => {
    const { data: { user } } = await supabase.auth.getUser()
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
    const { data: { user } } = await supabase.auth.getUser()
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
}))
