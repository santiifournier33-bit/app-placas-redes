"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { getModulesForRole, type ModuleDefinition } from "@/lib/auth/modules"
import type { UserRole } from "@/lib/auth/session"
import {
  LayoutDashboard, Paintbrush, ListTodo, MessageCircleQuestion, BookOpen,
  FolderOpen, BarChart3, DollarSign, Receipt, Mail,
  LogOut, Lock, PenLine
} from "lucide-react"
import { ReactNode, useState, useEffect } from "react"
import { resetAllStores } from "@/lib/stores/resetAllStores"
import { useConsultasBadge } from "@/lib/stores/useConsultasBadge"
import { getTheme } from "@/lib/theme"

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

function getIcon(iconName: string, size: number): ReactNode {
  const props = { size, strokeWidth: 1.8 }
  switch (iconName) {
    case 'Home': return <LayoutDashboard {...props} />
    case 'Brush2': return <Paintbrush {...props} />
    case 'TaskSquare': return <ListTodo {...props} />
    case 'MessageQuestion': return <MessageCircleQuestion {...props} />
    case 'Book1': return <BookOpen {...props} />
    case 'FolderOpen': return <FolderOpen {...props} />
    case 'Chart': return <BarChart3 {...props} />
    case 'DollarSquare': return <DollarSign {...props} />
    case 'Receipt1': return <Receipt {...props} />
    case 'Sms': return <Mail {...props} />
    case 'Signature': return <PenLine {...props} />
    default: return null
  }
}

interface SideNavProps {
  role: UserRole
  email: string
  collapsed?: boolean
}

export function SideNav({ role, email, collapsed = false }: SideNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    setThemeState(getTheme())
    const handler = () => setThemeState(getTheme())
    window.addEventListener("theme-change", handler)
    return () => window.removeEventListener("theme-change", handler)
  }, [])

  const allModules = getModulesForRole(role)

  const sharedModules = allModules.filter(m => m.access.includes('asesor'))
  const adminModules = allModules.filter(m => !m.access.includes('asesor'))

  const handleLogout = async () => {
    resetAllStores()
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  // Fade utility: width snaps instantly (avoids icon clipping when justify-center
  // is active during transition), opacity fades smoothly. Delay on fade-in so
  // labels appear AFTER the sidebar finishes growing.
  const fadeClass = `whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
    collapsed ? "w-0 opacity-0" : "opacity-100 delay-150"
  }`

  return (
    <aside
      style={{ transitionTimingFunction: EASE, willChange: "width" }}
      className={`hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-surface-1/95 backdrop-blur-xl border-r border-border-subtle z-50 transition-[width] duration-300 overflow-hidden ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo block — fixed height (matches PageHeader + TabNav).
       * Expanded: horizontal corporate logo (azul on light, blanco on dark).
       * Collapsed: square brand mark (favicon) so the w-16 strip stays clean. */}
      <Link
        href="/dashboard"
        className="h-14 border-b border-border-subtle flex items-center shrink-0 cursor-pointer hover:bg-surface-2 transition-colors px-4 gap-2.5"
      >
        <Image
          src={
            collapsed
              ? "/favicon.png"
              : theme === "light"
                ? "/logo-azul-app.png"
                : "/logo-blanco-app.png"
          }
          alt="Freire Propiedades"
          width={collapsed ? 28 : 130}
          height={collapsed ? 28 : 32}
          className="object-contain shrink-0 max-h-[32px] w-auto"
          priority
        />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {sharedModules.map((mod) => (
          <NavItem key={mod.id} mod={mod} pathname={pathname} collapsed={collapsed} />
        ))}

        {adminModules.length > 0 && (
          <>
            {/* Fixed-height divider block (28px). Text label fades, the bottom
                border line is constant. Keeps total height identical in both
                expanded and collapsed states so icons don't shift. */}
            <div className="relative h-7 mt-3 mb-1 mx-2 flex items-end">
              <span
                className={`text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] whitespace-nowrap px-1 transition-opacity duration-200 ${
                  collapsed ? "opacity-0" : "opacity-100 delay-150"
                }`}
              >
                Administración
              </span>
              <span className="absolute left-0 right-0 bottom-0 border-t border-border-subtle" />
            </div>
            {adminModules.map((mod) => (
              <NavItem key={mod.id} mod={mod} pathname={pathname} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border-subtle space-y-1 bg-gradient-to-t from-black/[0.03] to-transparent shrink-0">
        <div
          className={`flex items-center gap-2 px-3 overflow-hidden transition-opacity duration-200 ${
            collapsed ? "h-0 opacity-0 py-0" : "opacity-100 py-2"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
          <span className="text-xs md:text-[11px] font-medium text-text-muted truncate">
            {email}
          </span>
          <span className="ml-auto text-xs md:text-[9px] font-bold uppercase tracking-wider text-shell-accent bg-shell-accent-muted px-1.5 py-0.5 rounded">
            {role}
          </span>
        </div>
        {/* Theme toggle removed from sidebar — centralized in PageHeader
            (desktop) and in the 'Más' sheet (mobile). One source of truth
            avoids two redundant controls in the same shell. */}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className={`group flex items-center rounded-xl text-sm font-medium text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-[background-color,color,padding] duration-200 cursor-pointer ${
            collapsed ? "w-10 h-10 justify-center mx-auto gap-0 px-0" : "w-full h-10 px-3 gap-3"
          }`}
        >
          <LogOut size={20} strokeWidth={1.8} className="group-hover:-translate-x-1 transition-transform duration-300 shrink-0" />
          <span
            style={{ transitionTimingFunction: EASE }}
            className={fadeClass}
          >
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  )
}

function NavItem({ mod, pathname, collapsed }: { mod: ModuleDefinition; pathname: string; collapsed: boolean }) {
  const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
  const disabled = !mod.enabled
  const consultasBadge = useConsultasBadge()
  const badge = mod.id === 'consultas' ? consultasBadge : 0

  const labelClass = `whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
    collapsed ? "w-0 opacity-0" : "opacity-100 delay-150"
  }`

  // Consistent square pill in both states: w-10 h-10 when collapsed (centered),
  // h-10 stretching wide when expanded.
  const baseClass = `relative flex items-center rounded-xl text-sm font-medium overflow-hidden cursor-pointer transition-[background-color,color,padding] duration-200 ${
    collapsed ? "w-10 h-10 justify-center mx-auto gap-0 px-0" : "h-10 px-3 gap-3"
  }`

  if (disabled) {
    return (
      <div
        title={mod.label}
        className={`${baseClass} text-zinc-700 cursor-not-allowed`}
      >
        {getIcon(mod.icon, 20)}
        <span style={{ transitionTimingFunction: EASE }} className={labelClass}>
          {mod.label}
        </span>
        <Lock
          size={12}
          strokeWidth={2}
          className={`text-zinc-700 overflow-hidden transition-opacity duration-200 ${
            collapsed ? "w-0 opacity-0 ml-0" : "opacity-100 ml-auto"
          }`}
        />
      </div>
    )
  }

  return (
    <Link
      href={mod.href}
      scroll={false}
      title={collapsed ? mod.label : undefined}
      className={`group ${baseClass} ${
        active
          ? "text-shell-accent bg-shell-accent-muted shadow-[inset_0_1px_0_0_var(--color-shell-accent-muted)] font-semibold"
          : "text-text-muted hover:text-text-primary hover:bg-surface-2"
      }`}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-shell-accent rounded-r-full shadow-[0_0_8px_var(--color-shell-accent)]" />
      )}
      {getIcon(mod.icon, 20)}
      <span style={{ transitionTimingFunction: EASE }} className={labelClass}>
        {mod.label}
      </span>
      {badge > 0 && (
        <span
          className={`shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-xs md:text-[10px] font-bold text-zinc-950 ${
            collapsed
              ? 'absolute top-1 right-1 transform scale-75'
              : 'ml-auto'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
