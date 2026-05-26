"use client"

import { PanelLeftClose, PanelLeftOpen, Sun, Moon } from "lucide-react"
import { ReactNode, useState, useEffect } from "react"
import { useSidebar } from "./SidebarContext"
import { getTheme, toggleTheme } from "@/lib/theme"

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className = "" }: PageHeaderProps) {
  const { collapsed, toggle } = useSidebar()
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    setThemeState(getTheme())
    const handler = () => setThemeState(getTheme())
    window.addEventListener("theme-change", handler)
    return () => window.removeEventListener("theme-change", handler)
  }, [])

  return (
    <div
      className={`h-14 flex items-center gap-3 px-4 border-b border-white/[0.06] shrink-0 ${className}`}
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

      <div className="flex flex-col min-w-0 flex-1 leading-tight">
        <h1 className="text-sm font-bold text-shell-text truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-[11px] text-zinc-500 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-white/[0.06] hover:text-shell-text text-zinc-500 transition-colors cursor-pointer"
          title="Cambiar tema"
        >
          {theme === "light" ? (
            <Moon size={18} strokeWidth={1.8} />
          ) : (
            <Sun size={18} strokeWidth={1.8} />
          )}
        </button>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
