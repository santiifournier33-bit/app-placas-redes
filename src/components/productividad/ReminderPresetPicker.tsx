"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import type { Task } from "@/lib/stores/taskStore"

const PRESETS: { value: number | null; label: string }[] = [
  { value: null, label: "Sin recordatorio" },
  { value: 0, label: "A la hora" },
  { value: 10, label: "10 min antes" },
  { value: 60, label: "1 h antes" },
  { value: 1440, label: "1 día antes" },
]

/** Base moment a reminder is measured against: the task's due date at its
 *  due_time, or 09:00 local when no time is set. */
function dueBaseMs(task: Task): number | null {
  if (!task.due_date) return null
  return new Date(`${task.due_date}T${task.due_time ?? "09:00"}:00`).getTime()
}

function currentOffset(task: Task): number | null {
  const base = dueBaseMs(task)
  if (base === null || !task.reminder_at) return null
  return Math.round((base - new Date(task.reminder_at).getTime()) / 60000)
}

function offsetLabel(offset: number | null): string {
  if (offset === null) return "Sin recordatorio"
  if (offset === 0) return "A la hora"
  if (offset === 10) return "10 min antes"
  if (offset === 60) return "1 h antes"
  if (offset === 1440) return "1 día antes"
  return "Personalizado"
}

/**
 * Reminder preset selector built on the unified `reminder_at` field (the legacy
 * `reminder` column is no longer written). Self-contained inline expandable —
 * fits inside the mobile detail sheet. Disabled until the task has a due date.
 */
export function ReminderPresetPicker({
  task,
  updateTask,
}: {
  task: Task
  updateTask: (id: string, updates: Partial<Task>) => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const offset = currentOffset(task)
  const hasDate = !!task.due_date
  const active = offset !== null

  const apply = (offsetMin: number | null) => {
    setOpen(false)
    if (offsetMin === null || !task.due_date) {
      updateTask(task.id, { reminder_at: null, reminder_sent_at: null })
      return
    }
    const base = dueBaseMs(task)!
    updateTask(task.id, {
      reminder_at: new Date(base - offsetMin * 60 * 1000).toISOString(),
      reminder_sent_at: null,
    })
  }

  return (
    <div>
      <button
        onClick={() => hasDate && setOpen((o) => !o)}
        disabled={!hasDate}
        title={!hasDate ? "Asigná una fecha primero" : undefined}
        className={`flex items-center gap-2 text-sm cursor-pointer ${
          !hasDate ? "text-text-muted/50 cursor-not-allowed" : active ? "text-amber-400" : "text-text-muted"
        }`}
      >
        <Bell size={15} className="shrink-0" />
        {offsetLabel(offset)}
      </button>
      {open && hasDate && (
        <div className="mt-2 rounded-xl border border-border-subtle bg-surface-overlay py-1">
          {PRESETS.map((p) => (
            <button
              key={p.value ?? "none"}
              onClick={() => apply(p.value)}
              className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay-hover text-sm text-text-secondary cursor-pointer"
            >
              {p.label}
              {offset === p.value && <span className="ml-auto text-text-muted">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
