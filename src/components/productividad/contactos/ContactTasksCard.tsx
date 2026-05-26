'use client'

import { useMemo, useState } from 'react'
import { Plus, Check, Circle, Calendar } from 'lucide-react'
import { useTaskStore } from '@/lib/stores/taskStore'
import { QuickAddTask } from '@/components/productividad/QuickAddTask'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function ContactTasksCard({ contactId }: { contactId: string }) {
  const { tasks, toggleTask } = useTaskStore()
  const [adding, setAdding] = useState(false)

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

  return (
    <div className="px-5 pb-5 space-y-3">
      <h3 className="text-xs md:text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Tareas</h3>
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 cursor-pointer"
        >
          <Plus size={13} />
          Añadir tarea
        </button>
      )}

      {adding && (
        <QuickAddTask
          initialSectionId={null}
          preselectedContactId={contactId}
          hideContactPicker={true}
          onClose={() => setAdding(false)}
        />
      )}

      <div className="space-y-1">
        {contactTasks.length === 0 && !adding ? (
          <p className="text-xs text-zinc-600 py-3 text-center">Sin tareas asignadas</p>
        ) : contactTasks.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/[0.03] rounded-lg"
          >
            <button
              onClick={() => toggleTask(t.id)}
              className="shrink-0 cursor-pointer"
            >
              {t.completed
                ? <Check size={14} className="text-emerald-400" />
                : <Circle size={14} className="text-zinc-600" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-xs truncate ${t.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                {t.title}
              </p>
              {t.due_date && (
                <p className="text-xs md:text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
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
