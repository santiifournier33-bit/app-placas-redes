"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2, Pencil } from "lucide-react"
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
      <div className="px-4 py-3 border-b border-white/[0.04]">
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
          className="bg-transparent text-sm font-bold text-shell-text outline-none w-full"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
      <button onClick={onToggle} className="cursor-pointer">
        {collapsed ? (
          <ChevronRight size={16} className="text-zinc-500" />
        ) : (
          <ChevronDown size={16} className="text-zinc-500" />
        )}
      </button>
      <span className="text-sm font-bold text-shell-text">{name}</span>
      <span className="text-xs text-zinc-600 font-medium">{count}</span>

      <div className="ml-auto relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-white/[0.06] rounded cursor-pointer"
        >
          <MoreHorizontal size={16} className="text-zinc-600" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-7 bg-[#222230] rounded-xl border border-white/[0.08] py-1 z-10 shadow-xl min-w-[140px]">
            <button
              onClick={() => {
                setEditing(true)
                setShowMenu(false)
              }}
              className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-sm text-zinc-300 cursor-pointer"
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
