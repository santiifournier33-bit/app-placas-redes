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
  /** Last write/read failure surfaced to the UI. null = no error. */
  error: string | null

  reset: () => void
  clearError: () => void
  init: () => Promise<void>
  addTask: (title: string, sectionId?: string | null, extra?: Partial<Task>) => Promise<Task | null>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  addSection: (name: string) => Promise<void>
  renameSection: (id: string, name: string) => Promise<void>
  deleteSection: (id: string) => Promise<void>
  addSubtask: (parentId: string, title: string) => Promise<void>
}

const supabase = createClient()

// Surfaced when the Supabase session is gone (e.g. expired) but the app shell
// is still up via the separate app JWT. Without this, writes silently no-op.
export const NO_SESSION = 'Tu sesión expiró. Volvé a iniciar sesión para guardar los cambios.'

function syncTaskToGoogle(taskId: string, action: 'push' | 'remove') {
  // Fire-and-forget — never block UI on Google sync
  fetch('/api/google/tasks/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, action }),
  }).catch(() => {})
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  sections: [],
  initialized: false,
  error: null,

  reset: () => {
    supabase.removeChannel(supabase.channel('tasks-realtime'))
    set({ tasks: [], sections: [], initialized: false, error: null })
  },

  clearError: () => set({ error: null }),

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // No Supabase session → the list will be empty and every write would
      // silently fail. Surface it so the UI can prompt re-login.
      set({ initialized: false, error: NO_SESSION })
      return
    }

    // Keyset-paginate tasks (cursor = unique id) so accounts with >1000 tasks
    // aren't silently truncated at Supabase's default cap. Sections stay a
    // single query (always few). Both run in parallel.
    const loadAllTasks = async (): Promise<Task[]> => {
      const PAGE = 1000
      const all: Task[] = []
      let cursor: string | null = null
      for (;;) {
        let q = supabase
          .from('tasks')
          .select('*')
          .eq('owner_id', user.id)
          .is('deleted_at', null)
          .order('id', { ascending: true })
          .limit(PAGE)
        if (cursor) q = q.gt('id', cursor)
        const { data: page, error } = await q
        if (error || !page || page.length === 0) break
        all.push(...page)
        if (page.length < PAGE) break
        cursor = page[page.length - 1].id
      }
      // Restore the display ordering (position asc) the UI expects.
      all.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      return all
    }

    const [allTasks, sectionsRes] = await Promise.all([
      loadAllTasks(),
      supabase
        .from('task_sections')
        .select('*')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
    ])

    set({
      tasks: allTasks,
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

  addTask: async (title, sectionId = null, extra) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ error: NO_SESSION }); return null }

    const position = get().tasks.filter(t => t.section_id === sectionId && !t.parent_id).length

    // `extra` permite asociar contact_id / due_date / priority / etc. en el mismo INSERT,
    // de forma atómica. Antes el caller creaba la tarea y luego "adivinaba" la última del
    // store para actualizarla (race si entraba otra tarea en el medio). Devuelve la tarea.
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        owner_id: user.id,
        title,
        section_id: sectionId,
        position,
        ...extra,
      })
      .select()
      .single()

    if (error || !data) {
      set({ error: 'No se pudo crear la tarea. Reintentá.' })
      return null
    }

    set(s => ({ tasks: [...s.tasks, data] }))
    if (data.due_date) syncTaskToGoogle(data.id, 'push')
    return data
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    const completing = !task.completed
    const now = new Date().toISOString()
    const prevTasks = get().tasks

    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id
          ? { ...t, completed: completing, completed_at: completing ? now : null }
          : t
      ),
    }))

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: completing,
        completed_at: completing ? now : null,
        updated_at: now,
      })
      .eq('id', id)

    if (error) {
      // Roll back the optimistic change so the UI reflects reality.
      set({ tasks: prevTasks, error: 'No se pudo actualizar la tarea.' })
      return
    }

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
    const prev = get().tasks.find(t => t.id === id)
    const prevTasks = get().tasks
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id && t.parent_id !== id) }))

    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      set({ tasks: prevTasks, error: 'No se pudo eliminar la tarea.' })
      return
    }

    await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('parent_id', id)

    if (prev?.google_event_id) syncTaskToGoogle(id, 'remove')
  },

  updateTask: async (id, updates) => {
    const prev = get().tasks.find(t => t.id === id)
    const prevTasks = get().tasks
    set(s => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }))

    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      set({ tasks: prevTasks, error: 'No se pudo guardar el cambio.' })
      return
    }

    // Sync to Google when due_date, title or description changed and task has/should have an event
    const touchesEvent =
      'due_date' in updates ||
      'due_time' in updates ||
      'title' in updates ||
      'description' in updates
    if (touchesEvent) {
      const next = { ...(prev || {}), ...updates } as { due_date?: string | null; google_event_id?: string | null }
      if (next.due_date) {
        syncTaskToGoogle(id, 'push')
      } else if (prev?.google_event_id) {
        syncTaskToGoogle(id, 'remove')
      }
    }
  },

  addSection: async (name) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ error: NO_SESSION }); return }

    const position = get().sections.length

    const { data, error } = await supabase
      .from('task_sections')
      .insert({ owner_id: user.id, name, position })
      .select()
      .single()

    if (error || !data) {
      set({ error: 'No se pudo crear la sección. Reintentá.' })
      return
    }

    set(s => ({ sections: [...s.sections, data] }))
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
    if (!user) { set({ error: NO_SESSION }); return }

    const position = get().tasks.filter(t => t.parent_id === parentId).length

    const { data, error } = await supabase
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

    if (error || !data) {
      set({ error: 'No se pudo crear la subtarea. Reintentá.' })
      return
    }

    set(s => ({ tasks: [...s.tasks, data] }))
  },
}))
