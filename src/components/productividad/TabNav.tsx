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
    <div className="sticky top-0 z-20 h-14 flex items-center gap-2 bg-shell-bg/90 backdrop-blur-xl border-b border-white/[0.06] px-4 lg:px-4">
      <button
        onClick={toggle}
        className="hidden lg:flex p-2 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
        title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} /> : <PanelLeftClose size={18} strokeWidth={1.8} />}
      </button>
      <nav className="flex gap-1 overflow-x-auto scroll-x-affordance flex-1">
        {visibleTabs.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              scroll={false}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                active
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
              }`}
            >
              {icon}
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
