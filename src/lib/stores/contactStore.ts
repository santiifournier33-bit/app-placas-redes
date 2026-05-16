'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Tables, TablesInsert } from '@/lib/supabase/types'
import type { PipelineStage } from './pipelinesStore'

export type Contact = Tables<'contacts'>
export type ContactPipeline = Tables<'contact_pipelines'>

export type Circle = 'principal' | 'fundamental' | 'vital'
export type Category = 'A' | 'B' | 'C' | 'D'
export type Source = 'referido' | 'portal' | 'redes' | 'oficina' | 'otro'
export type HealthStatus = 'green' | 'orange' | 'red' | 'gray'

export const SOURCE_OPTIONS: Source[] = ['referido', 'portal', 'redes', 'oficina', 'otro']
export const SOURCE_LABELS: Record<Source, string> = {
  referido: 'Referido',
  portal: 'Portal',
  redes: 'Redes',
  oficina: 'Oficina',
  otro: 'Otro',
}

export const CIRCLE_LIMITS: Record<Circle, number> = {
  principal: 5,
  fundamental: 50,
  vital: 100,
}

export const CIRCLE_LABELS: Record<Circle, string> = {
  principal: 'Principales',
  fundamental: 'Fundamentales',
  vital: 'Vitales',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  A: 'Refiere solo',
  B: 'Refiere si pedís',
  C: 'Buena relación',
  D: 'Sin relación',
}

export interface KanbanContact extends Contact {
  contactPipelineId: string
  stageId: string
  pipelineId: string
  lastPipelineActivity: string | null
}

export function getLeadHealth(
  lastActivity: string | null | undefined,
  stage: PipelineStage | undefined
): HealthStatus {
  if (!stage || !stage.sla_days || stage.sla_days === 0) return 'gray'
  if (!lastActivity) return 'red'
  const daysSince = Math.floor(
    (Date.now() - new Date(lastActivity).getTime()) / 86400000
  )
  if (daysSince < stage.sla_days * 0.5) return 'green'
  if (daysSince < stage.sla_days) return 'orange'
  return 'red'
}

export function getDaysSinceActivity(dateStr: string | null | undefined): number {
  if (!dateStr) return 999
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000
  )
}

interface ContactState {
  contacts: Contact[]
  kanbanContacts: KanbanContact[]
  loading: boolean
  initialized: boolean

  reset: () => void
  init: () => Promise<void>
  fetchKanban: (pipelineId: string) => Promise<void>

  addContact: (data: Omit<TablesInsert<'contacts'>, 'owner_id'>, pipelineId?: string, stageId?: string) => Promise<Contact | null>
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>

  moveToStage: (contactPipelineId: string, newStageId: string) => Promise<void>
  addToPipeline: (contactId: string, pipelineId: string, stageId: string) => Promise<void>
  removeFromPipeline: (contactPipelineId: string) => Promise<void>

  markContacted: (id: string) => Promise<void>
  findDuplicate: (phone: string, email: string) => Contact | undefined
}

const supabase = createClient()

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  kanbanContacts: [],
  loading: true,
  initialized: false,

  reset: () => {
    supabase.removeChannel(supabase.channel('contacts-realtime'))
    set({ contacts: [], kanbanContacts: [], loading: true, initialized: false })
  },

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('last_activity_at', { ascending: false })

    set({
      contacts: data ?? [],
      loading: false,
    })

    supabase.removeChannel(supabase.channel('contacts-realtime'))
    supabase
      .channel('contacts-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'contacts',
        filter: `owner_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Contact
          set(s => ({ contacts: [row, ...s.contacts] }))
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as Contact
          set(s => ({
            contacts: s.contacts.map(c => c.id === row.id ? row : c),
          }))
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string }
          set(s => ({
            contacts: s.contacts.filter(c => c.id !== old.id),
          }))
        }
      })
      .subscribe()
  },

  fetchKanban: async (pipelineId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: cps } = await supabase
      .from('contact_pipelines')
      .select('*, contacts(*)')
      .eq('pipeline_id', pipelineId)
      .eq('owner_id', user.id)
      .order('last_activity_at', { ascending: false })

    if (!cps) {
      set({ kanbanContacts: [] })
      return
    }

    const kanban: KanbanContact[] = cps
      .filter(cp => cp.contacts && !(cp.contacts as Contact).deleted_at)
      .map(cp => {
        const contact = cp.contacts as Contact
        return {
          ...contact,
          contactPipelineId: cp.id,
          stageId: cp.stage_id,
          pipelineId: cp.pipeline_id,
          lastPipelineActivity: cp.last_activity_at,
        }
      })

    set({ kanbanContacts: kanban })
  },

  addContact: async (data, pipelineId, stageId) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      console.error('addContact: no auth session', authError)
      return null
    }

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({ ...data, owner_id: user.id })
      .select()
      .single()

    if (error || !contact) {
      console.error('addContact: insert failed', error)
      return null
    }

    set(s => ({ contacts: [contact, ...s.contacts] }))

    if (pipelineId && stageId) {
      await supabase.from('contact_pipelines').insert({
        contact_id: contact.id,
        pipeline_id: pipelineId,
        stage_id: stageId,
        owner_id: user.id,
      })
    }

    return contact
  },

  updateContact: async (id, updates) => {
    set(s => ({
      contacts: s.contacts.map(c => c.id === id ? { ...c, ...updates } : c),
      kanbanContacts: s.kanbanContacts.map(c => c.id === id ? { ...c, ...updates } : c),
    }))

    await supabase.from('contacts').update(updates).eq('id', id)
  },

  deleteContact: async (id) => {
    set(s => ({
      contacts: s.contacts.filter(c => c.id !== id),
      kanbanContacts: s.kanbanContacts.filter(c => c.id !== id),
    }))

    await supabase.from('contacts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  },

  moveToStage: async (contactPipelineId, newStageId) => {
    const now = new Date().toISOString()

    set(s => ({
      kanbanContacts: s.kanbanContacts.map(c =>
        c.contactPipelineId === contactPipelineId
          ? { ...c, stageId: newStageId, lastPipelineActivity: now }
          : c
      ),
    }))

    await supabase
      .from('contact_pipelines')
      .update({ stage_id: newStageId, last_activity_at: now })
      .eq('id', contactPipelineId)
  },

  addToPipeline: async (contactId, pipelineId, stageId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('contact_pipelines').insert({
      contact_id: contactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      owner_id: user.id,
    })
  },

  removeFromPipeline: async (contactPipelineId) => {
    set(s => ({
      kanbanContacts: s.kanbanContacts.filter(c => c.contactPipelineId !== contactPipelineId),
    }))

    await supabase.from('contact_pipelines').delete().eq('id', contactPipelineId)
  },

  markContacted: async (id) => {
    const now = new Date().toISOString()
    await get().updateContact(id, {
      last_contact_date: now.slice(0, 10),
      last_activity_at: now,
    })
  },

  findDuplicate: (phone, email) => {
    const { contacts } = get()
    if (!phone && !email) return undefined
    return contacts.find(c =>
      (phone && c.primary_phone === phone) ||
      (email && c.primary_email === email)
    )
  },
}))
