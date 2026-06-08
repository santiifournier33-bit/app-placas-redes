"use client"

import { useState } from "react"
import { format, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronRight, Flag, Check, CornerDownRight } from "lucide-react"
import { motion, useMotionValue, useTransform, useReducedMotion } from "framer-motion"
import type { Task } from "@/lib/stores/taskStore"
import { useTaskStore } from "@/lib/stores/taskStore"
import { TaskScheduler } from "@/components/productividad/TaskScheduler"

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
  const reduce = useReducedMotion()
  const [schedOpen, setSchedOpen] = useState(false)

  const dueLocal = task.due_date ? new Date(task.due_date.slice(0, 10) + "T12:00:00") : null
  const overdue =
    dueLocal && isPast(dueLocal) && !isToday(dueLocal) && !task.completed

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
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`relative ${indent ? "pl-10" : ""} border-b border-border-subtle overflow-hidden`}
    >
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
        className="relative group flex items-start gap-1.5 px-4 py-2.5 bg-shell-bg hover:bg-surface-overlay transition-colors cursor-pointer touch-pan-y active:scale-[0.99]"
        onClick={onTap}
      >
        {/* 44×44 hit area (coarse pointers) wrapping a 22px visual circle so the
            most-used action passes the touch-target gate without a bulky look. */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            doToggle(task.id)
          }}
          aria-label={task.completed ? "Marcar como pendiente" : "Completar tarea"}
          className="-my-2.5 -ml-2 mr-0.5 shrink-0 flex items-center justify-center touch-manipulation"
        >
          <span
            className={`mt-2.5 w-[22px] h-[22px] rounded-full border-[1.5px] transition-all duration-200 flex items-center justify-center ${
              task.completed ? `${priorityBg[task.priority]} border-transparent` : priorityColors[task.priority]
            }`}
          >
            {task.completed && (
              <motion.svg
                width="10" height="8" viewBox="0 0 10 8" fill="none"
                initial={reduce ? false : { scale: 0.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 18 }}
              >
                <motion.path
                  d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: reduce ? 0 : 0.04 }}
                />
              </motion.svg>
            )}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${task.completed ? "line-through text-text-muted" : "text-text-primary"}`}>
            {task.title}
          </p>

          {task.description && (
            <p className="text-xs text-text-muted truncate mt-0.5 max-w-[90%]">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {task.due_date && (
              <button
                onClick={(e) => { e.stopPropagation(); setSchedOpen(true) }}
                className={`text-xs flex items-center gap-1 rounded px-1 -mx-1 hover:bg-surface-overlay-hover active:scale-95 transition-all touch-manipulation ${overdue ? "text-red-400" : "text-text-muted"}`}
              >
                {format(new Date(task.due_date.slice(0, 10) + "T12:00:00"), "d MMM", { locale: es })}
                {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
              </button>
            )}

            {subtaskCount > 0 && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <CornerDownRight size={11} className="shrink-0" />
                {subtaskDone}/{subtaskCount}
              </span>
            )}

            {task.priority < 4 && <Flag size={11} className={priorityColors[task.priority].split(" ")[1]} />}
          </div>
        </div>

        <ChevronRight
          size={16}
          className="text-text-muted/40 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
        />
      </motion.div>

      <TaskScheduler
        taskId={task.id}
        currentDate={task.due_date}
        currentTime={task.due_time}
        open={schedOpen}
        onOpenChange={setSchedOpen}
      />
    </motion.div>
  )
}
