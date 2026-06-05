"use client"

import { useState } from "react"
import { Plus, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks,
  isToday, isTomorrow, isSameDay, isBefore, startOfDay,
  startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { useTaskStore } from "@/lib/stores/taskStore"
import type { Task } from "@/lib/stores/taskStore"
import { TaskItem } from "@/components/productividad/TaskItem"
import { TaskCard } from "@/components/productividad/BoardColumn"
import { QuickAddTask } from "@/components/productividad/QuickAddTask"

/* Parse a date-only string at local noon so UTC parsing never shifts the day. */
function dueLocal(t: Task): Date | null {
  return t.due_date ? new Date(t.due_date.slice(0, 10) + "T12:00:00") : null
}
const dayStr = (d: Date) => format(d, "yyyy-MM-dd")

function dayHeading(day: Date): string {
  const weekday = format(day, "EEEE", { locale: es })
  const datePart = format(day, "d MMM", { locale: es })
  if (isToday(day)) return `${datePart} · Hoy · ${weekday}`
  if (isTomorrow(day)) return `${datePart} · Mañana · ${weekday}`
  return `${datePart} · ${weekday}`
}

interface ProximoViewProps {
  tasks: Task[]
  displayMode: "lista" | "panel"
  isMobile: boolean
  getSubtasks: (id: string) => Task[]
  onSelectTask: (t: Task) => void
  onToggleTask: (id: string) => void
  /** Mobile only: open the bottom-sheet add for a given day. Desktop uses inline QuickAddTask. */
  onAddForDay: (dateStr: string) => void
}

export function ProximoView({
  tasks, displayMode, isMobile, getSubtasks, onSelectTask, onToggleTask, onAddForDay,
}: ProximoViewProps) {
  const updateTask = useTaskStore((s) => s.updateTask)
  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const [pickerMonth, setPickerMonth] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  // Desktop inline add: which day's QuickAddTask is open (yyyy-MM-dd).
  const [addingDay, setAddingDay] = useState<string | null>(null)
  const handleAdd = (d: string) => { if (isMobile) onAddForDay(d); else setAddingDay(d) }

  const today = startOfDay(new Date())
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 0 })
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 0 }))
  // Current week → today..end; navigated weeks → full week.
  const allWeekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const days = isCurrentWeek ? allWeekDays.filter((d) => !isBefore(startOfDay(d), today)) : allWeekDays

  const dated = tasks.filter((t) => t.due_date && !t.parent_id)
  const overdue = dated.filter((t) => {
    const d = dueLocal(t)
    return d && isBefore(startOfDay(d), today) && !t.completed
  })
  const tasksForDay = (day: Date) => dated.filter((t) => {
    const d = dueLocal(t)
    return d && isSameDay(d, day)
  })

  const reschedule = (taskId: string, day: Date) => updateTask(taskId, { due_date: dayStr(day) })
  const reprogramarVencidas = () => overdue.forEach((t) => reschedule(t.id, new Date()))
  const subCounts = (id: string) => {
    const subs = getSubtasks(id)
    return { count: subs.length, done: subs.filter((s) => s.completed).length }
  }

  /* ── Header: month picker + week navigator ── */
  const header = (
    <div className="px-4 pt-4 pb-2 shrink-0">
      <h2 className="text-2xl font-bold text-text-primary">Próximo</h2>
      <div className="flex items-center justify-between mt-2 gap-2">
        {/* Month / date picker */}
        <div className="relative">
          <button
            onClick={() => { setPickerMonth(weekAnchor); setShowPicker((v) => !v) }}
            className="flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-text-primary capitalize active:scale-95 transition-all touch-manipulation"
          >
            {format(weekAnchor, "MMMM yyyy", { locale: es })}
            <ChevronDown size={14} className={`transition-transform ${showPicker ? "rotate-180" : ""}`} />
          </button>
          {showPicker && (
            <MiniMonth
              month={pickerMonth}
              selected={weekAnchor}
              onPrev={() => setPickerMonth((m) => subMonths(m, 1))}
              onNext={() => setPickerMonth((m) => addMonths(m, 1))}
              onPick={(d) => { setWeekAnchor(d); setShowPicker(false) }}
            />
          )}
        </div>
        {/* Week navigator */}
        <div className="flex items-center gap-0.5 bg-surface-2 rounded-xl px-1 py-0.5">
          <button
            onClick={() => setWeekAnchor((w) => addWeeks(w, -1))}
            title="Semana anterior"
            className="p-1.5 rounded-lg hover:bg-surface-overlay-hover text-text-muted hover:text-text-secondary active:scale-90 transition-all touch-manipulation"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekAnchor(new Date())}
            className="px-2 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary active:scale-95 transition-all"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
            title="Próxima semana"
            className="p-1.5 rounded-lg hover:bg-surface-overlay-hover text-text-muted hover:text-text-secondary active:scale-90 transition-all touch-manipulation"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  /* ── LISTA ── */
  if (displayMode === "lista") {
    return (
      <div className="flex flex-col">
        {header}
        {overdue.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Vencidas {overdue.length}</span>
              <button onClick={reprogramarVencidas} className="text-xs font-semibold text-red-400 hover:text-red-300 active:scale-95 transition-all">Reprogramar</button>
            </div>
            {overdue.map((t) => {
              const s = subCounts(t.id)
              return <TaskItem key={t.id} task={t} subtaskCount={s.count} subtaskDone={s.done} onTap={() => onSelectTask(t)} onToggle={onToggleTask} />
            })}
          </div>
        )}
        {days.map((day) => {
          const dayTasks = tasksForDay(day)
          return (
            <div key={dayStr(day)} className="border-t border-border-subtle first:border-t-0">
              <div className="px-4 pt-3 pb-1">
                <span className="text-sm font-bold text-text-primary capitalize">{dayHeading(day)}</span>
                {dayTasks.length > 0 && <span className="ml-2 text-xs text-text-muted">{dayTasks.length}</span>}
              </div>
              {dayTasks.map((t) => {
                const s = subCounts(t.id)
                return <TaskItem key={t.id} task={t} subtaskCount={s.count} subtaskDone={s.done} onTap={() => onSelectTask(t)} onToggle={onToggleTask} />
              })}
              {addingDay === dayStr(day) ? (
                <div className="px-4 pb-2 pt-1">
                  <QuickAddTask initialSectionId={null} initialDate={dayStr(day)} onClose={() => setAddingDay(null)} />
                </div>
              ) : (
                <button
                  onClick={() => handleAdd(dayStr(day))}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text-secondary w-full cursor-pointer active:scale-[0.99] transition-transform touch-manipulation"
                >
                  <Plus size={14} /> Añadir tarea
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /* ── PANEL (kanban por día) ── */
  return (
    <div className="flex flex-col">
      {header}
      <div
        className="flex items-start gap-3 overflow-x-auto pt-2 pb-6 snap-container"
        style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain", paddingLeft: "calc((100vw - 92vw) / 2)", paddingRight: "calc((100vw - 92vw) / 2)" }}
      >
        {overdue.length > 0 && (
          <div className="snap-center shrink-0">
            <DayColumn
              title={`Vencidas`}
              count={overdue.length}
              accent="red"
              tasks={overdue}
              subCounts={subCounts}
              onSelectTask={onSelectTask}
              onToggleTask={onToggleTask}
              onDragStart={setDraggedId}
              draggedId={draggedId}
              headerRight={<button onClick={reprogramarVencidas} className="text-xs font-semibold text-red-400 hover:text-red-300">Reprogramar</button>}
            />
          </div>
        )}
        {days.map((day) => (
          <div key={dayStr(day)} className="snap-center shrink-0">
            <DayColumn
              title={dayHeading(day)}
              count={tasksForDay(day).length}
              tasks={tasksForDay(day)}
              subCounts={subCounts}
              onSelectTask={onSelectTask}
              onToggleTask={onToggleTask}
              onDragStart={setDraggedId}
              draggedId={draggedId}
              onDropDay={() => { if (draggedId) { reschedule(draggedId, day); setDraggedId(null) } }}
              onAdd={() => handleAdd(dayStr(day))}
              adding={addingDay === dayStr(day)}
              dateStr={dayStr(day)}
              onCloseAdd={() => setAddingDay(null)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Mini month picker (jump to a week/day) ── */
function MiniMonth({
  month, selected, onPrev, onNext, onPick,
}: {
  month: Date
  selected: Date
  onPrev: () => void
  onNext: () => void
  onPick: (d: Date) => void
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })
  return (
    <div className="absolute left-0 top-8 z-30 w-64 bg-surface-2 border border-border-default rounded-xl shadow-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} className="p-1 rounded-lg hover:bg-surface-overlay text-text-muted active:scale-90 transition-all"><ChevronLeft size={15} /></button>
        <span className="text-sm font-bold text-text-primary capitalize">{format(month, "MMMM yyyy", { locale: es })}</span>
        <button onClick={onNext} className="p-1 rounded-lg hover:bg-surface-overlay text-text-muted active:scale-90 transition-all"><ChevronRight size={15} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-text-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const inMonth = isSameMonth(d, month)
          const today = isToday(d)
          const sel = isSameDay(d, selected)
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPick(d)}
              className={`aspect-square rounded-lg text-xs flex items-center justify-center active:scale-90 transition-all touch-manipulation ${
                sel ? "bg-blue-500 text-white font-bold" :
                today ? "text-red-400 font-bold hover:bg-surface-overlay" :
                inMonth ? "text-text-secondary hover:bg-surface-overlay" : "text-text-muted/40 hover:bg-surface-overlay"
              }`}
            >
              {format(d, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── A single day column (panel) ── */
function DayColumn({
  title, count, tasks, subCounts, onSelectTask, onToggleTask,
  onDragStart, draggedId, onDropDay, onAdd, accent, headerRight,
  adding, dateStr, onCloseAdd,
}: {
  title: string
  count: number
  tasks: Task[]
  subCounts: (id: string) => { count: number; done: number }
  onSelectTask: (t: Task) => void
  onToggleTask: (id: string) => void
  onDragStart: (id: string) => void
  draggedId: string | null
  onDropDay?: () => void
  onAdd?: () => void
  accent?: "red"
  headerRight?: React.ReactNode
  adding?: boolean
  dateStr?: string
  onCloseAdd?: () => void
}) {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={onDropDay ? (e) => { e.preventDefault(); setOver(true) } : undefined}
      onDragLeave={() => setOver(false)}
      onDrop={onDropDay ? (e) => { e.preventDefault(); setOver(false); onDropDay() } : undefined}
      className={`flex flex-col self-start shrink-0 w-[92vw] lg:w-72 rounded-2xl border transition-colors ${
        over ? "bg-blue-500/[0.05] border-blue-500/30" : "bg-surface-overlay border-border-subtle"
      }`}
    >
      <div className="flex items-center justify-between px-3 h-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold uppercase tracking-wider truncate ${accent === "red" ? "text-red-400" : "text-text-primary"}`}>{title}</span>
          <span className="text-xs text-text-muted font-medium shrink-0">{count}</span>
        </div>
        {headerRight}
      </div>
      <div className="flex flex-col gap-2 px-2 pb-2">
        {tasks.map((t) => {
          const s = subCounts(t.id)
          return (
            <TaskCard
              key={t.id}
              task={t}
              subtaskCount={s.count}
              subtaskDone={s.done}
              onTap={() => onSelectTask(t)}
              onToggle={() => onToggleTask(t.id)}
              onDragStart={() => onDragStart(t.id)}
              isDragging={draggedId === t.id}
            />
          )
        })}
        {adding && dateStr ? (
          <QuickAddTask initialSectionId={null} initialDate={dateStr} onClose={onCloseAdd ?? (() => {})} />
        ) : onAdd ? (
          <button
            onClick={onAdd}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:bg-surface-overlay transition-colors cursor-pointer border border-dashed border-border-subtle hover:border-border-default active:scale-[0.99] touch-manipulation"
          >
            <Plus size={18} /> Añadir tarea
          </button>
        ) : null}
      </div>
    </div>
  )
}
