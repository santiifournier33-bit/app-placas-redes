"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CheckSquare, Briefcase, Contact, Calendar,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import type { UserRole } from "@/lib/auth/session"
import { modules, isSubLocked, type SubModuleDefinition } from "@/lib/auth/modules"
import { useSidebar } from "@/components/nav/SidebarContext"

// Map the icon name declared in modules.ts → the lucide icon this bar uses.
// Single source of truth = modules.ts children; the bar only owns presentation.
const ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  CheckSquare,
  Briefcase,
  Users: Contact,
  Calendar,
}

function tabIcon(name: string | undefined): ReactNode {
  const Icon = name ? ICONS[name] : undefined
  return Icon ? <Icon size={18} strokeWidth={1.8} /> : null
}

interface TabNavProps {
  role?: UserRole
}

export function TabNav({ role }: TabNavProps) {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  // Sub-sections come straight from modules.ts so nav, sidebar and this bar
  // never drift. Filter by per-child access (role), keep the rest.
  const children: SubModuleDefinition[] =
    modules.find(m => m.id === "productividad")?.children ?? []
  const visibleTabs = children.filter(c => !c.access || (role ? c.access.includes(role) : true))

  return (
    <div className="sticky top-0 z-20 h-14 flex items-center gap-2 bg-shell-bg/90 backdrop-blur-xl border-b border-border-subtle px-2 lg:px-4">
      <button
        onClick={toggle}
        className="hidden lg:flex p-2 rounded-xl hover:bg-surface-overlay-hover text-text-muted hover:text-text-secondary transition-colors cursor-pointer shrink-0"
        title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} /> : <PanelLeftClose size={18} strokeWidth={1.8} />}
      </button>
      <nav className="flex flex-1 gap-1">
        {visibleTabs.map((tab) => {
          const locked = role ? isSubLocked(tab, role) : false
          const iconWrap = (
            <span className="[&>svg]:w-[15px] [&>svg]:h-[15px] sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
              {tabIcon(tab.icon)}
            </span>
          )

          // Phase-locked sub-section: visible but non-navigable, "Próximamente".
          if (locked) {
            return (
              <div
                key={tab.href}
                title={`${tab.label} — Próximamente`}
                className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap text-zinc-500 cursor-not-allowed"
              >
                {iconWrap}
                <span className="truncate">{tab.label}</span>
              </div>
            )
          }

          const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              scroll={false}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                active
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-overlay"
              }`}
            >
              {iconWrap}
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
