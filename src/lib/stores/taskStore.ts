import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/types'
import { generateNextDueDate, type RecurrenceConfig } from '@/lib/productividad/recurrence'

export type Task = Tables<'tasks'>
export type TaskSection = Tables<'task_sections'>

export type TaskType =
  | 'tarea' | 'visita' | 'llamada' | 'reunion' | 'firma'
  | 'cafe' | 'item_valor' | 'item_valor_masivo'

export const TASK_TYPES: Record<TaskType, { label: string; iconName: string }> = {
  tarea:             { label: 'Tarea',             iconName: 'CheckSquare'   },
  visita:            { label: 'Visita',            iconName: 'MapPin'        },
  llamada:           { label: 'Llamada',           iconName: 'Phone'         },
  reunion:           { label: 'Reunión',           iconName: 'Users'         },
  firma:             { label: 'Firma',             iconName: 'PenLine'       },
  cafe:              { label: 'Café',              iconName: 'Coffee'        },
  item_valor:        { label: 'Item de valor',     iconName: 'Gift'          },
  item_valor_masivo: { label: 'Valor masivo',      iconName: 'Megaphone'     },
}

export interface TaskState {
  tasks: Task[]
  sections: TaskSection[]
  initialized: boolean

  reset: () => void
  init: () => Promise<void>
  addTask: (title: string, sectionId?: string | null) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  addSection: (name: string) => Promise<void>
  renameSection: (id: string, name: string) => Promise<void>
  deleteSection: (id: string) => Promise<void>
  addSubtask: (parentId: string, title: string) => Promise<void>
}

const supabase = createClient()

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  sections: [],
  initialized: false,

  reset: () => {
    supabase.removeChannel(supabase.channel('tasks-realtime'))
    set({ tasks: [], sections: [], initialized: false })
  },

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [tasksRes, sectionsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
      supabase
        .from('task_sections')
        .select('*')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
    ])

    set({
      tasks: tasksRes.data ?? [],
      sections: sectionsRes.data ?? [],
    })

    supabase.removeChannel(supabase.channel('tasks-realtime'))
    supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `owner_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Task
          set(s => {
            if (s.tasks.some(t => t.id === row.id)) return s
            return { tasks: [...s.tasks, row] }
          })
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as Task
          set(s => ({
            tasks: row.deleted_at
              ? s.tasks.filter(t => t.id !== row.id)
              : s.tasks.map(t => t.id === row.id ? row : t),
          }))
        } else if (payload.eventType === 'DELETE') {
          set(s => ({ tasks: s.tasks.filter(t => t.id !== (payload.old as Task).id) }))
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_sections',
        filter: `owner_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as TaskSection
          set(s => {
            if (s.sections.some(sec => sec.id === row.id)) return s
            return { sections: [...s.sections, row] }
          })
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as TaskSection
          set(s => ({
            sections: row.deleted_at
              ? s.sections.filter(sec => sec.id !== row.id)
              : s.sections.map(sec => sec.id === row.id ? row : sec),
          }))
        } else if (payload.eventType === 'DELETE') {
          set(s => ({ sections: s.sections.filter(sec => sec.id !== (payload.old as TaskSection).id) }))
        }
      })
      .subscribe()
  },

  addTask: async (title, sectionId = null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const position = get().tasks.filter(t => t.section_id === sectionId && !t.parent_id).length

    const { data } = await supabase
      .from('tasks')
      .insert({
        owner_id: user.id,
        title,
        section_id: sectionId,
        position,
      })
      .select()
      .single()

    if (data) set(s => ({ tasks: [...s.tasks, data] }))
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    const completing = !task.completed
    const now = new Date().toISOString()

    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id
          ? { ...t, completed: completing, completed_at: completing ? now : null }
          : t
      ),
    }))

    await supabase
      .from('tasks')
      .update({
        completed: completing,
        completed_at: completing ? now : null,
        updated_at: now,
      })
      .eq('id', id)

    if (completing && task.recurrence_freq) {
      const config: RecurrenceConfig = {
        freq: task.recurrence_freq as RecurrenceConfig['freq'],
        interval: task.recurrence_interval ?? undefined,
        dayOfMonth: task.recurrence_day_of_month ?? undefined,
        dayOfWeek: task.recurrence_day_of_week ?? undefined,
        endDate: task.recurrence_end_date ?? undefined,
      }
      const nextDue = generateNextDueDate(
        task.due_date ?? new Date().toISOString().slice(0, 10),
        config
      )
      if (nextDue) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: nextTask } = await supabase
          .from('tasks')
          .insert({
            owner_id: user.id,
            title: task.title,
            description: task.description,
            section_id: task.section_id,
            contact_id: task.contact_id,
            priority: task.priority,
            task_type: task.task_type,
            reminder: task.reminder,
            due_date: nextDue,
            due_time: task.due_time,
            recurrence_freq: task.recurrence_freq,
            recurrence_interval: task.recurrence_interval,
            recurrence_day_of_week: task.recurrence_day_of_week,
            recurrence_day_of_month: task.recurrence_day_of_month,
            recurrence_end_date: task.recurrence_end_date,
            recurrence_parent_id: task.recurrence_parent_id ?? task.id,
            position: task.position,
          })
          .select()
          .single()

        if (nextTask) set(s => ({ tasks: [...s.tasks, nextTask] }))
      }
    }
  },

  deleteTask: async (id) => {
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id && t.parent_id !== id) }))

    await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('parent_id', id)
  },

  updateTask: async (id, updates) => {
    set(s => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }))

    await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
  },

  addSection: async (name) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const position = get().sections.length

    const { data } = await supabase
      .from('task_sections')
      .insert({ owner_id: user.id, name, position })
      .select()
      .single()

    if (data) set(s => ({ sections: [...s.sections, data] }))
  },

  renameSection: async (id, name) => {
    set(s => ({
      sections: s.sections.map(sec => sec.id === id ? { ...sec, name } : sec),
    }))

    await supabase
      .from('task_sections')
      .update({ name })
      .eq('id', id)
  },

  deleteSection: async (id) => {
    set(s => ({
      sections: s.sections.filter(sec => sec.id !== id),
      tasks: s.tasks.map(t => t.section_id === id ? { ...t, section_id: null } : t),
    }))

    await supabase
      .from('task_sections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    await supabase
      .from('tasks')
      .update({ section_id: null })
      .eq('section_id', id)
  },

  addSubtask: async (parentId, title) => {
    const parent = get().tasks.find(t => t.id === parentId)
    if (!parent) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const position = get().tasks.filter(t => t.parent_id === parentId).length

    const { data } = await supabase
      .from('tasks')
      .insert({
        owner_id: user.id,
        title,
        section_id: parent.section_id,
        parent_id: parentId,
        position,
      })
      .select()
      .single()

    if (data) set(s => ({ tasks: [...s.tasks, data] }))
  },
}))
