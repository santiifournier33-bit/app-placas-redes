"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { BoardColumn } from "./BoardColumn"
import { useTaskStore } from "@/lib/stores/taskStore"
import type { Task, TaskSection } from "@/lib/stores/taskStore"

interface BoardViewProps {
  tasks: Task[]
  sections: TaskSection[]
  showCompleted: boolean
  onSelectTask: (t: Task) => void
  onToggleTask?: (id: string) => void
  onMobileAdd?: (sectionId: string | null) => void
  isMobile?: boolean
}

export function BoardView({ tasks, sections, showCompleted, onSelectTask, onToggleTask, onMobileAdd, isMobile }: BoardViewProps) {
  const { addSection, updateTask } = useTaskStore()
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const unsectionedTasks = tasks.filter((t) => !t.section_id)
  const sortedSections = [...sections].sort((a, b) => a.position - b.position)

  const handleAddSection = () => {
    if (!newSectionName.trim()) return
    addSection(newSectionName.trim())
    setNewSectionName("")
    setShowAddSection(false)
  }

  const handleDrop = (targetSectionId: string | null) => {
    if (!draggedTaskId) return
    updateTask(draggedTaskId, { section_id: targetSectionId })
    setDraggedTaskId(null)
  }

  return (
    <div 
      className="flex items-start gap-3 overflow-x-auto pt-4 pb-6 min-h-[60vh] lg:px-4 snap-container" 
      style={{ scrollSnapType: "x mandatory", paddingLeft: "calc((100vw - 92vw) / 2)", paddingRight: "calc((100vw - 92vw) / 2)" }}
    >
      {/* (Sin sección) column */}
      <div className="snap-center shrink-0">
        <BoardColumn
          title="Sin sección"
          sectionId={null}
          tasks={unsectionedTasks}
          showCompleted={showCompleted}
          onSelectTask={onSelectTask}
          draggedTaskId={draggedTaskId}
          onDragStart={setDraggedTaskId}
          onDrop={handleDrop}
          onToggleTask={onToggleTask}
          onMobileAdd={onMobileAdd}
          isMobile={isMobile}
        />
      </div>

      {/* Section columns */}
      {sortedSections.map((sec) => {
        const sectionTasks = tasks.filter((t) => t.section_id === sec.id)
        return (
          <div key={sec.id} className="snap-center shrink-0">
            <BoardColumn
              title={sec.name}
              sectionId={sec.id}
              tasks={sectionTasks}
              showCompleted={showCompleted}
              onSelectTask={onSelectTask}
              draggedTaskId={draggedTaskId}
              onDragStart={setDraggedTaskId}
              onDrop={handleDrop}
              onToggleTask={onToggleTask}
              onMobileAdd={onMobileAdd}
              isMobile={isMobile}
            />
          </div>
        )
      })}

      {/* Add section button / form */}
      <div className="shrink-0 flex items-start snap-center">
        {showAddSection ? (
          <div className="w-64 rounded-2xl border border-border-default bg-surface-overlay p-3 space-y-3">
            <input
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSection()
                if (e.key === "Escape") { setShowAddSection(false); setNewSectionName("") }
              }}
              placeholder="Dale un nombre a esta sección"
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none border-b border-border-default pb-2"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddSection}
                disabled={!newSectionName.trim()}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  newSectionName.trim()
                    ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                    : "bg-zinc-800 text-text-muted cursor-not-allowed"
                }`}
              >
                Añadir sección
              </button>
              <button
                onClick={() => { setShowAddSection(false); setNewSectionName("") }}
                className="text-xs text-text-muted hover:text-text-secondary cursor-pointer px-2 py-1.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-secondary border border-dashed border-border-default hover:border-white/[0.15] rounded-2xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} />
            Añadir sección
          </button>
        )}
      </div>
    </div>
  )
}
