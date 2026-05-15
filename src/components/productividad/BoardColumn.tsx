"use client"

import { useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, CheckSquare, MapPin, Phone, Users, PenLine, Coffee, Gift, Megaphone } from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { useTaskStore, TASK_TYPES, type TaskType } from "@/lib/stores/taskStore"
import { QuickAddTask } from "./QuickAddTask"
import type { Task } from "@/lib/stores/taskStore"

const PRIORITY_BORDER: Record<number, string> = {
  1: "rgb(239 68 68)",
  2: "rgb(249 115 22)",
  3: "rgb(59 130 246)",
  4: "rgb(82 82 91)",
}

const PRIORITY_BG: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-blue-500",
  4: "bg-zinc-600",
}

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  tarea:             <CheckSquare size={12} />,
  visita:            <MapPin      size={12} />,
  llamada:           <Phone       size={12} />,
  reunion:           <Users       size={12} />,
  firma:             <PenLine     size={12} />,
  cafe:              <Coffee      size={12} />,
  item_valor:        <Gift        size={12} />,
  item_valor_masivo: <Megaphone   size={12} />,
}

interface BoardColumnProps {
  title: string
  sectionId: string | null
  tasks: Task[]
  showCompleted: boolean
  onSelectTask: (t: Task) => void
  draggedTaskId: string | null
  onDragStart: (id: string) => void
  onDrop: (sectionId: string | null) => void
  onToggleTask?: (id: string) => void
}

export function BoardColumn({
  title, sectionId, tasks, showCompleted, onSelectTask,
  draggedTaskId, onDragStart, onDrop, onToggleTask,
}: BoardColumnProps) {
  const { renameSection, deleteSection, toggleTask, tasks: allTasks } = useTaskStore()
  const doToggle = (id: string) => onToggleTask ? onToggleTask(id) : toggleTask(id)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameName, setRenameName] = useState(title)
  const [isDragOver, setIsDragOver] = useState(false)

  const incomplete = tasks.filter((t) => !t.completed)
  const completed = showCompleted ? tasks.filter((t) => t.completed) : []

  const handleRename = () => {
    if (sectionId && renameName.trim()) renameSection(sectionId, renameName.trim())
    setRenaming(false)
    setShowMenu(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(sectionId)
  }

  const getSubtasks = (taskId: string) => allTasks.filter((t) => t.parent_id === taskId)

  return (
    <div
      className={`flex flex-col shrink-0 w-72 rounded-2xl border transition-colors ${
        isDragOver
          ? "bg-blue-500/[0.04] border-blue-500/30"
          : "bg-white/[0.02] border-white/[0.06]"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {renaming ? (
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename()
                if (e.key === "Escape") { setRenaming(false); setRenameName(title) }
              }}
              className="bg-transparent text-sm font-bold text-shell-text outline-none w-36"
            />
          ) : (
            <span className="text-xs font-bold text-shell-text uppercase tracking-widest">{title}</span>
          )}
          <span className="text-xs text-zinc-600 font-medium">{incomplete.length}</span>
        </div>
        {sectionId && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-white/[0.06] rounded-lg cursor-pointer text-zinc-600 hover:text-zinc-400"
            >
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-1 z-20 shadow-xl min-w-[140px]">
                <button
                  onClick={() => { setRenaming(true); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-300 cursor-pointer"
                >
                  <Pencil size={13} /> Renombrar
                </button>
                <button
                  onClick={() => { if (sectionId) deleteSection(sectionId); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-red-500/10 text-xs text-red-400 cursor-pointer"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-2 pb-2 flex-1 min-h-[40px]">
        {incomplete.map((task) => {
          const subs = getSubtasks(task.id)
          return (
            <TaskCard
              key={task.id}
              task={task}
              subtaskCount={subs.length}
              subtaskDone={subs.filter((s) => s.completed).length}
              onTap={() => onSelectTask(task)}
              onToggle={() => doToggle(task.id)}
              onDragStart={() => onDragStart(task.id)}
              isDragging={draggedTaskId === task.id}
            />
          )
        })}

        {completed.length > 0 && (
          <>
            <div className="px-1 pt-1">
              <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                Completadas {completed.length}
              </span>
            </div>
            {completed.map((task) => {
              const subs = getSubtasks(task.id)
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  subtaskCount={subs.length}
                  subtaskDone={subs.filter((s) => s.completed).length}
                  onTap={() => onSelectTask(task)}
                  onToggle={() => doToggle(task.id)}
                  onDragStart={() => onDragStart(task.id)}
                  isDragging={draggedTaskId === task.id}
                />
              )
            })}
          </>
        )}

        {/* Quick add */}
        {showQuickAdd && (
          <QuickAddTask sectionId={sectionId} onClose={() => setShowQuickAdd(false)} />
        )}
      </div>

      {/* Footer add button */}
      {!showQuickAdd && (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02] rounded-b-2xl transition-colors cursor-pointer border-t border-white/[0.04]"
        >
          <Plus size={14} />
          Añadir tarea
        </button>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  subtaskCount: number
  subtaskDone: number
  onTap: () => void
  onToggle: () => void
  onDragStart: () => void
  isDragging: boolean
}

function TaskCard({ task, subtaskCount, subtaskDone, onTap, onToggle, onDragStart, isDragging }: TaskCardProps) {
  const overdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !task.completed
  const effectiveType = (task.task_type ?? "tarea") as TaskType

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onClick={onTap}
      className={`rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? "opacity-40 scale-[0.97]"
          : task.completed
            ? "bg-white/[0.01] border-white/[0.04] opacity-60 cursor-pointer"
            : "bg-white/[0.04] border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Priority circle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
            task.completed ? `${PRIORITY_BG[task.priority ?? 4]} border-transparent` : ""
          }`}
          style={{
            borderColor: !task.completed ? PRIORITY_BORDER[task.priority ?? 4] : undefined,
          }}
        >
          {task.completed && (
            <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
              <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${task.completed ? "line-through text-zinc-600" : "text-shell-text"}`}>
            {task.title}
          </p>

          {/* Meta row */}
          {(task.due_date || subtaskCount > 0 || effectiveType !== "tarea") && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {task.due_date && (
                <span className={`text-[10px] ${overdue ? "text-red-400" : "text-zinc-600"}`}>
                  {format(new Date(task.due_date), "d MMM", { locale: es })}
                </span>
              )}
              {subtaskCount > 0 && (
                <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  {subtaskDone}/{subtaskCount}
                </span>
              )}
              {effectiveType !== "tarea" && TASK_TYPES[effectiveType] && (
                <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                  {TYPE_ICONS[effectiveType]}
                  {TASK_TYPES[effectiveType].label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
