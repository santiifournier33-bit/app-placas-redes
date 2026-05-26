"use client"

import { format, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronRight, Flag, Check } from "lucide-react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import type { Task } from "@/lib/stores/taskStore"
import { useTaskStore } from "@/lib/stores/taskStore"

const priorityColors: Record<number, string> = {
  1: "border-red-500 text-red-500",
  2: "border-orange-500 text-orange-500",
  3: "border-blue-500 text-blue-500",
  4: "border-zinc-600 text-text-muted",
}

const priorityBg: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-blue-500",
  4: "bg-zinc-500",
}

interface TaskItemProps {
  task: Task
  subtaskCount?: number
  subtaskDone?: number
  onTap?: () => void
  indent?: boolean
  onToggle?: (id: string) => void
}

export function TaskItem({ task, subtaskCount = 0, subtaskDone = 0, onTap, indent, onToggle }: TaskItemProps) {
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const doToggle = (id: string) => (onToggle ? onToggle(id) : toggleTask(id))

  const overdue =
    task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !task.completed

  // Horizontal drag → swipe-left to complete. Threshold at -64px. Background
  // emerald reveal indicates the action. Click still works at drag distance 0
  // (framer's drag listener only fires past dragThreshold ~3px).
  const x = useMotionValue(0)
  const bgOpacity = useTransform(x, [-100, -20, 0], [1, 0.2, 0])
  const labelOpacity = useTransform(x, [-100, -60, -20], [1, 1, 0])

  const handleDragEnd = () => {
    if (x.get() < -64) {
      doToggle(task.id)
    }
    x.set(0)
  }

  return (
    <div className={`relative ${indent ? "pl-10" : ""} border-b border-border-subtle overflow-hidden`}>
      {/* Background swipe reveal (left=complete) */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0 bg-emerald-500/20 flex items-center justify-end px-6"
      >
        <motion.div style={{ opacity: labelOpacity }} className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
          <Check size={18} />
          Completar
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative group flex items-start gap-3 px-4 py-3 bg-shell-bg hover:bg-surface-overlay transition-colors cursor-pointer touch-pan-y"
        onClick={onTap}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            doToggle(task.id)
          }}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-all duration-200 flex items-center justify-center no-tap-target ${
            task.completed ? `${priorityBg[task.priority]} border-transparent` : priorityColors[task.priority]
          }`}
        >
          {task.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${task.completed ? "line-through text-text-muted" : "text-text-primary"}`}>
            {task.title}
          </p>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.due_date && (
              <span
                className={`text-xs md:text-[11px] flex items-center gap-1 ${overdue ? "text-red-400" : "text-text-muted"}`}
              >
                {format(new Date(task.due_date), "d MMM", { locale: es })}
              </span>
            )}

            {subtaskCount > 0 && (
              <span className="text-xs md:text-[11px] text-text-muted flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {subtaskDone}/{subtaskCount}
              </span>
            )}

            {task.priority < 4 && <Flag size={11} className={priorityColors[task.priority].split(" ")[1]} />}
          </div>
        </div>

        <ChevronRight
          size={16}
          className="text-text-muted/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </motion.div>
    </div>
  )
}
