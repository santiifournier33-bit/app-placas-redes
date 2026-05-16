"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import type { ReactNode } from "react"
import { useSidebar } from "./SidebarContext"

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className = "" }: PageHeaderProps) {
  const { collapsed, toggle } = useSidebar()

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0 ${className}`}
    >
      <button
        onClick={toggle}
        className="hidden lg:flex p-2 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
        title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen size={18} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={18} strokeWidth={1.8} />
        )}
      </button>

      <div className="flex flex-col min-w-0 flex-1">
        <h1 className="text-base font-bold text-shell-text truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
