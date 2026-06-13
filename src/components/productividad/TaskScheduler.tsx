"use client"

import { useTaskStore } from "@/lib/stores/taskStore"
import { DateTimePopover } from "@/components/productividad/DateTimePopover"

interface TaskSchedulerProps {
  taskId: string | null
  currentDate?: string | null
  currentTime?: string | null
  /** Offset actual del recordatorio en minutos antes del vencimiento (null = sin). */
  currentReminderOffsetMin?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Reagendar fecha + hora + recordatorio de una tarea existente. Usa el host
 * compartido DateTimePopover (móvil = bottom-sheet scrolleable; desktop = dialog
 * centrado, sin ancla). Escribe vía taskStore.updateTask. Mismo patrón que el
 * flujo de crear → consistencia total.
 */
export function TaskScheduler({ taskId, currentDate, currentTime, currentReminderOffsetMin = null, open, onOpenChange }: TaskSchedulerProps) {
  const updateTask = useTaskStore((s) => s.updateTask)
  const current = currentDate ? currentDate.slice(0, 10) : null
  const currentHM = currentTime ? currentTime.slice(0, 5) : null

  // reminder_at = vencimiento (date + time, default 09:00) − offset. Misma fórmula
  // que QuickAddTask/TaskDetail; se recomputa en cada cambio de fecha/hora/offset.
  const computeReminderAt = (date: string | null, time: string | null, offsetMin: number | null): string | null => {
    if (offsetMin === null || !date) return null
    const due = new Date(`${date}T${time ?? "09:00"}:00`).getTime()
    return new Date(due - offsetMin * 60 * 1000).toISOString()
  }

  return (
    <DateTimePopover
      open={open}
      onOpenChange={onOpenChange}
      title="Fecha y hora"
      date={current}
      time={currentHM}
      reminderOffsetMin={currentReminderOffsetMin}
      onChange={({ date, time, reminderOffsetMin }) => {
        if (!taskId) return
        const t = date ? time : null
        updateTask(taskId, {
          due_date: date,
          due_time: t,
          reminder_at: computeReminderAt(date, t, reminderOffsetMin),
          reminder_sent_at: null,
        })
      }}
    />
  )
}
