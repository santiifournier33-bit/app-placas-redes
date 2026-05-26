"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Receipt, Building2, BarChart3, Tags,
} from "lucide-react"
import type { ReactNode } from "react"

const tabs: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/servicios/dashboard",   label: "Dashboard",   icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { href: "/servicios/gastos",      label: "Gastos",      icon: <Receipt size={18} strokeWidth={1.8} /> },
  { href: "/servicios/proveedores", label: "Proveedores", icon: <Building2 size={18} strokeWidth={1.8} /> },
  { href: "/servicios/graficos",    label: "Gráficos",    icon: <BarChart3 size={18} strokeWidth={1.8} /> },
  { href: "/servicios/categorias",  label: "Categorías",  icon: <Tags size={18} strokeWidth={1.8} /> },
]

export function TabNav() {
  const pathname = usePathname()

  return (
    <div className="sticky top-0 z-20 bg-shell-bg/90 backdrop-blur-xl border-b border-border-subtle">
      <nav className="flex gap-1 px-4 lg:px-6 overflow-x-auto scroll-x-affordance py-2">
        {tabs.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              scroll={false}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                active
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-overlay"
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
