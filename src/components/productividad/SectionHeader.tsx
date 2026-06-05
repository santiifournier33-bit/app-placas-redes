"use client"

import { useState } from "react"
import { ChevronDown, MoreHorizontal, Trash2, Pencil } from "lucide-react"
import { useTaskStore } from "@/lib/stores/taskStore"

interface SectionHeaderProps {
  id: string
  name: string
  count: number
  collapsed: boolean
  onToggle: () => void
}

export function SectionHeader({ id, name, count, collapsed, onToggle }: SectionHeaderProps) {
  const { renameSection, deleteSection } = useTaskStore()
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(name)

  if (editing) {
    return (
      <div className="px-4 py-3 border-b border-border-subtle">
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => {
            if (editName.trim()) renameSection(id, editName.trim())
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            if (e.key === "Escape") {
              setEditName(name)
              setEditing(false)
            }
          }}
          className="bg-transparent text-sm font-bold text-text-primary outline-none w-full"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
      <button onClick={onToggle} className="cursor-pointer active:scale-90 transition-transform touch-manipulation">
        <ChevronDown
          size={16}
          className={`text-text-muted transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>
      <span className="text-sm font-bold text-text-primary">{name}</span>
      <span className="text-xs text-text-muted font-medium">{count}</span>

      <div className="ml-auto relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-surface-overlay-hover rounded cursor-pointer"
        >
          <MoreHorizontal size={16} className="text-text-muted" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-7 bg-surface-2 rounded-xl border border-border-default py-1 z-10 shadow-xl min-w-[140px]">
            <button
              onClick={() => {
                setEditing(true)
                setShowMenu(false)
              }}
              className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-sm text-text-secondary cursor-pointer"
            >
              <Pencil size={14} />
              Renombrar
            </button>
            <button
              onClick={() => {
                deleteSection(id)
                setShowMenu(false)
              }}
              className="flex items-center gap-2 px-3 py-2 w-full hover:bg-red-500/10 text-sm text-red-400 cursor-pointer"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
