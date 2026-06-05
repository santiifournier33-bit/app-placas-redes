"use client"

import { format, addDays, nextSaturday, nextMonday } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Sun, Sofa, ArrowRight, CalendarOff } from "lucide-react"
import { useTaskStore } from "@/lib/stores/taskStore"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/lib/hooks/useIsMobile"

interface TaskSchedulerProps {
  taskId: string | null
  currentDate?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One-tap reschedule. Quick chips (Hoy / Mañana / Este fin de semana /
 * Próxima semana / Sin fecha) plus a native date input for any other day.
 * Writes via the existing taskStore.updateTask — no new data logic.
 * Bottom-sheet on mobile, small dialog on desktop.
 */
export function TaskScheduler({ taskId, currentDate, open, onOpenChange }: TaskSchedulerProps) {
  const updateTask = useTaskStore((s) => s.updateTask)
  const isMobile = useIsMobile()
  const today = new Date()
  const current = currentDate ? currentDate.slice(0, 10) : null

  const options = [
    { key: "hoy",     label: "Hoy",                 sub: format(today, "EEE", { locale: es }),               value: format(today, "yyyy-MM-dd"),               Icon: Calendar,   color: "text-emerald-400" },
    { key: "manana",  label: "Mañana",              sub: format(addDays(today, 1), "EEE", { locale: es }),    value: format(addDays(today, 1), "yyyy-MM-dd"),    Icon: Sun,        color: "text-orange-400" },
    { key: "finde",   label: "Este fin de semana",  sub: format(nextSaturday(today), "d MMM", { locale: es }),value: format(nextSaturday(today), "yyyy-MM-dd"),  Icon: Sofa,       color: "text-blue-400" },
    { key: "proxima", label: "Próxima semana",      sub: format(nextMonday(today), "d MMM", { locale: es }),  value: format(nextMonday(today), "yyyy-MM-dd"),    Icon: ArrowRight, color: "text-violet-400" },
    { key: "sin",     label: "Sin fecha",           sub: "",                                                  value: null,                                       Icon: CalendarOff, color: "text-text-muted" },
  ] as const

  const pick = (value: string | null) => {
    if (taskId) updateTask(taskId, { due_date: value })
    onOpenChange(false)
  }

  const body = (
    <div className="py-1">
      {options.map((o) => {
        const active = current === o.value
        return (
          <button
            key={o.key}
            onClick={() => pick(o.value)}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-surface-overlay active:scale-[0.98] transition-all text-left touch-manipulation"
          >
            <o.Icon size={18} className={o.color} />
            <span className="flex-1 text-sm text-text-secondary">{o.label}</span>
            {o.sub && <span className="text-xs text-text-muted capitalize">{o.sub}</span>}
            {active && <span className="text-xs text-brand-gold font-semibold">✓</span>}
          </button>
        )
      })}
      <div className="border-t border-border-subtle mt-1 pt-3 px-4 pb-3">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Otra fecha</p>
        <input
          type="date"
          value={current ?? ""}
          onChange={(e) => pick(e.target.value || null)}
          className="w-full bg-transparent text-sm text-text-secondary outline-none [color-scheme:dark]"
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" showClose={false} className="rounded-t-2xl p-0 bg-surface-1 pb-[env(safe-area-inset-bottom)]">
          <SheetTitle className="sr-only">Reagendar tarea</SheetTitle>
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-border-strong/40" />
          </div>
          <div className="px-4 py-2">
            <span className="text-sm font-bold text-text-primary">Reagendar</span>
          </div>
          {body}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[300px] p-0 sm:rounded-2xl bg-surface-1 overflow-hidden border-border-default" showClose={false}>
        <DialogTitle className="sr-only">Reagendar tarea</DialogTitle>
        <div className="px-4 pt-3 pb-1">
          <span className="text-sm font-bold text-text-primary">Reagendar</span>
        </div>
        {body}
      </DialogContent>
    </Dialog>
  )
}
