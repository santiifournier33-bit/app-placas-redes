'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Tables, TablesInsert } from '@/lib/supabase/types'

export type CalendarEvent = Tables<'calendar_events'>
export type EventType = 'reunion' | 'capacitacion' | 'charla' | 'deadline' | 'visita'

export const EVENT_COLORS: Record<EventType, { bg: string; text: string; label: string }> = {
  reunion: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Reunion' },
  capacitacion: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Capacitacion' },
  charla: { bg: 'bg-violet-500/15', text: 'text-violet-400', label: 'Charla' },
  deadline: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Deadline' },
  visita: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Visita' },
}

interface CalendarState {
  events: CalendarEvent[]
  loading: boolean
  initialized: boolean

  reset: () => void
  init: () => Promise<void>
  addEvent: (data: Omit<TablesInsert<'calendar_events'>, 'owner_id'>) => Promise<CalendarEvent | null>
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
}

const supabase = createClient()

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  loading: true,
  initialized: false,

  reset: () => {
    supabase.removeChannel(supabase.channel('calendar-events-realtime'))
    set({ events: [], loading: true, initialized: false })
  },

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    // RLS enforces: own personal events + organization-scope events visible to all
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .is('deleted_at', null)
      .order('event_date', { ascending: true })

    set({
      events: data ?? [],
      loading: false,
    })

    supabase.removeChannel(supabase.channel('calendar-events-realtime'))
    supabase
      .channel('calendar-events-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'calendar_events',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as CalendarEvent
          set(s => ({ events: [...s.events, row].sort((a, b) => a.event_date.localeCompare(b.event_date)) }))
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as CalendarEvent
          if (row.deleted_at) {
            set(s => ({ events: s.events.filter(e => e.id !== row.id) }))
          } else {
            set(s => ({
              events: s.events.map(e => e.id === row.id ? row : e),
            }))
          }
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string }
          set(s => ({ events: s.events.filter(e => e.id !== old.id) }))
        }
      })
      .subscribe()
  },

  addEvent: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({ ...data, owner_id: user.id })
      .select()
      .single()

    if (error || !event) return null
    set(s => ({
      events: [...s.events, event].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    }))
    return event
  },

  updateEvent: async (id, updates) => {
    set(s => ({
      events: s.events.map(e => e.id === id ? { ...e, ...updates } : e),
    }))
    await supabase.from('calendar_events').update(updates).eq('id', id)
  },

  deleteEvent: async (id) => {
    set(s => ({ events: s.events.filter(e => e.id !== id) }))
    await supabase.from('calendar_events').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  },
}))
