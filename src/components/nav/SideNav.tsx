"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { getModulesForRole, isModuleLocked, isSubLocked, type ModuleDefinition, type SubModuleDefinition } from "@/lib/auth/modules"
import type { UserRole } from "@/lib/auth/session"
import {
  LayoutDashboard, Paintbrush, ListTodo, MessageCircleQuestion, BookOpen,
  FolderOpen, BarChart3, DollarSign, Receipt, Mail,
  LogOut, Lock, PenLine, ChevronRight, Target,
  Activity, Calendar, Trophy, Flag, CheckSquare, Briefcase, Users, UsersRound,
  Building2, FileText, Inbox, UserCheck, TrendingUp, Scale, Tags, Truck, PieChart,
} from "lucide-react"
import { ReactNode, useState, useEffect, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { resetAllStores } from "@/lib/stores/resetAllStores"
import { useConsultasBadge } from "@/lib/stores/useConsultasBadge"
import { getTheme } from "@/lib/theme"
import { useSidebar } from "./SidebarContext"

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

function getIcon(iconName: string, size: number): ReactNode {
  const props = { size, strokeWidth: 1.8 }
  switch (iconName) {
    case 'Home': return <LayoutDashboard {...props} />
    case 'Target': return <Target {...props} />
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
    // Sub-section icons
    case 'Activity': return <Activity {...props} />
    case 'Calendar': return <Calendar {...props} />
    case 'Trophy': return <Trophy {...props} />
    case 'Flag': return <Flag {...props} />
    case 'CheckSquare': return <CheckSquare {...props} />
    case 'Briefcase': return <Briefcase {...props} />
    case 'Users': return <Users {...props} />
    case 'UsersRound': return <UsersRound {...props} />
    case 'Building2': return <Building2 {...props} />
    case 'FileText': return <FileText {...props} />
    case 'Inbox': return <Inbox {...props} />
    case 'UserCheck': return <UserCheck {...props} />
    case 'TrendingUp': return <TrendingUp {...props} />
    case 'Scale': return <Scale {...props} />
    case 'LayoutDashboard': return <LayoutDashboard {...props} />
    case 'Tags': return <Tags {...props} />
    case 'Truck': return <Truck {...props} />
    case 'PieChart': return <PieChart {...props} />
    default: return null
  }
}

interface SideNavProps {
  role: UserRole
  email: string
  collapsed?: boolean
}

const EXPANDED_STORAGE_KEY = "freire:sidenav:expanded"

// Match a pathname (with optional ?search) to a child href. Children can use
// query params (e.g. /diseno?tab=properties), so we compare path + query.
function childMatchesLocation(child: SubModuleDefinition, pathname: string, search: string): boolean {
  const [childPath, childQuery = ""] = child.href.split("?")
  if (pathname !== childPath) return false
  if (!childQuery) return true
  // Every key in childQuery must match the URL's search params
  const want = new URLSearchParams(childQuery)
  const have = new URLSearchParams(search)
  for (const [k, v] of want) {
    if (have.get(k) !== v) return false
  }
  return true
}

function moduleContainsLocation(mod: ModuleDefinition, pathname: string, search: string): boolean {
  if (!mod.children) return false
  return mod.children.some(c => childMatchesLocation(c, pathname, search))
}

export function SideNav({ role, email, collapsed = false }: SideNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toggle: toggleSidebar } = useSidebar()
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark')

  // Read current ?search at render time. usePathname does not include it.
  const [search, setSearch] = useState<string>("")
  useEffect(() => {
    setSearch(typeof window !== "undefined" ? window.location.search : "")
    const onPop = () => setSearch(window.location.search)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [pathname])

  // Accordion expanded set (module ids). Persisted in localStorage so the
  // user's preferred shape survives reloads. Auto-includes any module that
  // contains the current location on mount.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_STORAGE_KEY)
      const stored: string[] = raw ? JSON.parse(raw) : []
      const next = new Set(stored)
      // ensure the module containing the current route is open
      for (const m of getModulesForRole(role)) {
        if (moduleContainsLocation(m, pathname, typeof window !== "undefined" ? window.location.search : "")) {
          next.add(m.id)
        }
      }
      setExpanded(next)
    } catch {
      setExpanded(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Click on a parent module (accordion). Single-open behavior:
  //   1. navigate to its first enabled sub-section,
  //   2. open this group,
  //   3. close every other group (exclusive set).
  // If the sidebar is collapsed, also expand it first.
  const openGroupExclusive = (id: string, firstHref?: string) => {
    if (collapsed) toggleSidebar()
    setExpanded(() => {
      const next = new Set<string>([id])
      try { localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
    if (firstHref) router.push(firstHref)
  }

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
       * Expanded: horizontal corporate logo (azul on light, blanco on dark),
       * centered within the w-64 strip. Collapsed: square brand mark
       * (favicon-blanco) centered in the w-16 strip. */}
      <Link
        href="/dashboard"
        className="h-14 border-b border-border-subtle flex items-center justify-center shrink-0 cursor-pointer hover:bg-surface-2 transition-colors px-3"
      >
        <Image
          src={
            collapsed
              ? "/favicon-blanco.png"
              : theme === "light"
                ? "/logo-azul-app.png"
                : "/logo-blanco-app.png"
          }
          alt="Freire Propiedades"
          width={collapsed ? 28 : 150}
          height={collapsed ? 28 : 36}
          className="object-contain shrink-0 max-h-[36px] w-auto"
          priority
        />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {sharedModules.map((mod) => (
          <NavRow
            key={mod.id}
            mod={mod}
            pathname={pathname}
            search={search}
            collapsed={collapsed}
            role={role}
            expanded={expanded.has(mod.id)}
            onOpenGroup={openGroupExclusive}
          />
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
              <NavRow
            key={mod.id}
            mod={mod}
            pathname={pathname}
            search={search}
            collapsed={collapsed}
            role={role}
            expanded={expanded.has(mod.id)}
            onOpenGroup={openGroupExclusive}
          />
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

// Dispatcher: picks a leaf NavItem or an accordion NavGroup based on whether
// the module declares `children`. Receives lifted state from the parent so
// the expand/collapse animation can coordinate with the sidebar width.
interface NavRowProps {
  mod: ModuleDefinition
  pathname: string
  search: string
  collapsed: boolean
  role: UserRole
  expanded: boolean
  onOpenGroup: (id: string, firstHref?: string) => void
}

function NavRow(props: NavRowProps) {
  const { mod, role } = props
  // Phase-locked module: render a single disabled "Próximamente" row, even if
  // it has children (no accordion, no navigation).
  if (isModuleLocked(mod, role)) {
    return <NavItem mod={mod} pathname={props.pathname} collapsed={props.collapsed} locked />
  }
  if (mod.children && mod.children.length > 0) {
    return <NavGroup {...props} />
  }
  return <NavItem mod={props.mod} pathname={props.pathname} collapsed={props.collapsed} />
}

function NavGroup({
  mod, pathname, search, collapsed, role,
  expanded, onOpenGroup,
}: NavRowProps) {
  const consultasBadge = useConsultasBadge()
  const badge = mod.id === 'consultas' ? consultasBadge : 0

  const visibleChildren = useMemo(() => {
    return (mod.children ?? []).filter(c => !c.access || c.access.includes(role))
  }, [mod.children, role])

  const childActive = visibleChildren.some(c => childMatchesLocation(c, pathname, search))
  // Parent gets a subtle "contains active" highlight when collapsed so the
  // user knows where they are even with the accordion shut.
  const parentHighlight = childActive

  // Clicking the group navigates to its first *navigable* child — phase-locked
  // sub-sections are shown but never landed on.
  const firstOpenable = visibleChildren.find(c => !isSubLocked(c, role))

  const labelClass = `whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
    collapsed ? "w-0 opacity-0" : "opacity-100 delay-150"
  }`

  const baseClass = `relative flex items-center rounded-xl text-sm font-medium overflow-hidden cursor-pointer transition-[background-color,color,padding] duration-200 ${
    collapsed ? "w-10 h-10 justify-center mx-auto gap-0 px-0" : "h-10 px-3 gap-3 w-full"
  }`

  const handleClick = () => {
    onOpenGroup(mod.id, firstOpenable?.href)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={expanded}
        aria-controls={`navgroup-${mod.id}`}
        title={collapsed ? mod.label : undefined}
        className={`group ${baseClass} ${
          parentHighlight
            ? "text-shell-accent bg-shell-accent-muted/60 font-semibold"
            : "text-text-muted hover:text-text-primary hover:bg-surface-2"
        }`}
      >
        {parentHighlight && !collapsed && (
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
                : 'ml-2'
            }`}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {!collapsed && (
          <ChevronRight
            size={14}
            strokeWidth={2}
            className="ml-auto shrink-0 text-text-muted transition-transform duration-300"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && !collapsed && (
          <motion.ul
            id={`navgroup-${mod.id}`}
            role="group"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
            className="mt-0.5 space-y-0.5"
          >
            {visibleChildren.map(child => {
              const locked = isSubLocked(child, role)
              if (locked) {
                return (
                  <li key={child.id}>
                    <div
                      title={`${child.label} — Próximamente`}
                      className="flex items-center gap-2.5 pl-7 pr-2 h-9 rounded-lg text-[13px] font-medium text-zinc-500 cursor-not-allowed"
                    >
                      <span className="shrink-0 opacity-50">{getIcon(child.icon ?? "", 17)}</span>
                      <span className="truncate">{child.label}</span>
                      <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wide text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                        Próximamente
                      </span>
                    </div>
                  </li>
                )
              }
              const active = childMatchesLocation(child, pathname, search)
              return (
                <li key={child.id}>
                  <Link
                    href={child.href}
                    scroll={false}
                    className={`flex items-center gap-2.5 pl-7 pr-3 h-9 rounded-lg text-[13px] font-medium transition-colors ${
                      active
                        ? "text-shell-accent bg-shell-accent-muted"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-2"
                    }`}
                  >
                    <span className={`shrink-0 ${active ? "opacity-100" : "opacity-70"}`}>
                      {getIcon(child.icon ?? "", 17)}
                    </span>
                    <span className="truncate">{child.label}</span>
                  </Link>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavItem({ mod, pathname, collapsed, locked = false }: { mod: ModuleDefinition; pathname: string; collapsed: boolean; locked?: boolean }) {
  const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
  const disabled = !mod.enabled || locked
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
    // Phase-locked (lockedFor) reads as roadmap → "Próximamente" pill.
    // Not-in-production (enabled:false) keeps the bare lock.
    return (
      <div
        title={locked ? `${mod.label} — Próximamente` : mod.label}
        className={`${baseClass} text-zinc-500 cursor-not-allowed`}
      >
        {getIcon(mod.icon, 20)}
        <span style={{ transitionTimingFunction: EASE }} className={labelClass}>
          {mod.label}
        </span>
        {locked ? (
          !collapsed && (
            <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wide text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
              Próximamente
            </span>
          )
        ) : (
          <Lock
            size={12}
            strokeWidth={2}
            className={`text-zinc-700 overflow-hidden transition-opacity duration-200 ${
              collapsed ? "w-0 opacity-0 ml-0" : "opacity-100 ml-auto"
            }`}
          />
        )}
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
