'use client'

import { useState, useMemo } from 'react'
import { Plus, Check, Circle, Calendar } from 'lucide-react'
import { useTaskStore } from '@/lib/stores/taskStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function ContactTasksTab({ contactId }: { contactId: string }) {
  const { tasks, addTask, toggleTask, updateTask } = useTaskStore()
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')

  const contactTasks = useMemo(
    () => tasks
      .filter(t => t.contact_id === contactId && !t.parent_id && !t.deleted_at)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        const da = a.due_date ?? ''
        const db = b.due_date ?? ''
        return da.localeCompare(db)
      }),
    [tasks, contactId]
  )

  const handleAdd = async () => {
    const title = newTitle.trim()
    if (!title) return
    await addTask(title, null)
    // The just-created task has the latest id in the store
    const latest = useTaskStore.getState().tasks
      .filter(t => t.title === title && !t.contact_id)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
    if (latest) {
      await updateTask(latest.id, {
        contact_id: contactId,
        ...(newDate ? { due_date: newDate } : {}),
      })
    }
    setNewTitle('')
    setNewDate('')
  }

  return (
    <div className="p-4 space-y-3">
      <div className="space-y-2">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nueva tarea..."
          className="w-full bg-surface-overlay border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-blue-500/30"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="bg-surface-overlay border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-secondary outline-none [color-scheme:dark]"
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-xs font-medium cursor-pointer ml-auto"
          >
            <Plus size={13} />
            Agregar
          </button>
        </div>
      </div>

      <div className="space-y-1 pt-2">
        {contactTasks.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">Sin tareas asignadas a este contacto</p>
        ) : contactTasks.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-overlay rounded-lg"
          >
            <button
              onClick={() => toggleTask(t.id)}
              className="shrink-0 cursor-pointer"
            >
              {t.completed
                ? <Check size={14} className="text-emerald-400" />
                : <Circle size={14} className="text-text-muted" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-xs truncate ${t.completed ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                {t.title}
              </p>
              {t.due_date && (
                <p className="text-xs md:text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                  <Calendar size={9} />
                  {format(new Date(t.due_date), "d 'de' MMM", { locale: es })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
