"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CheckSquare, Briefcase, Users, Contact, Calendar,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import type { ReactNode } from "react"
import type { UserRole } from "@/lib/auth/session"
import { useSidebar } from "@/components/nav/SidebarContext"

interface Tab {
  href: string
  label: string
  icon: ReactNode
  adminOnly?: boolean
}

const tabs: Tab[] = [
  { href: "/productividad/tareas", label: "Tareas", icon: <CheckSquare size={18} strokeWidth={1.8} /> },
  { href: "/productividad/negocios", label: "Negocios", icon: <Briefcase size={18} strokeWidth={1.8} /> },
  { href: "/productividad/equipo", label: "Equipo", icon: <Users size={18} strokeWidth={1.8} />, adminOnly: true },
  { href: "/productividad/contactos", label: "Contactos", icon: <Contact size={18} strokeWidth={1.8} /> },
  { href: "/productividad/calendario", label: "Calendario", icon: <Calendar size={18} strokeWidth={1.8} /> },
]

interface TabNavProps {
  role?: UserRole
}

export function TabNav({ role }: TabNavProps) {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  const visibleTabs = tabs.filter(t => !t.adminOnly || role === 'admin')

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
        {visibleTabs.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              scroll={false}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                active
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-overlay"
              }`}
            >
              <span className="[&>svg]:w-[15px] [&>svg]:h-[15px] sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
                {icon}
              </span>
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
