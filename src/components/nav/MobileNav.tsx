"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { UserRole } from "@/lib/auth/session"
import {
  ListChecks, Users, Search, Palette, MoreHorizontal,
  FileText, DollarSign, Wallet, Calendar,
  LayoutDashboard, BookOpen, PenLine,
  Mail, BarChart3, Target,
  Sun, Moon, LogOut, ChevronRight,
} from "lucide-react"
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { resetAllStores } from "@/lib/stores/resetAllStores"
import { getTheme, toggleTheme } from "@/lib/theme"
import { isPathLocked } from "@/lib/auth/modules"

interface MobileNavProps {
  role: UserRole
  email: string
}

interface NavItem {
  href: string
  label: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

// Bottom bar: primary 4 items ranked by field usage.
// Same order for both roles — admin accesses Correo/admin modules via "Más".
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",                label: "Home",      Icon: LayoutDashboard },
  { href: "/embudo",                   label: "Embudo",    Icon: Target },
  { href: "/productividad/contactos",  label: "Contactos", Icon: Users },
  { href: "/diseno",                   label: "Diseño",    Icon: Palette },
]

// "Más" sheet: full module directory grouped by function.
// Items in the bottom bar are intentionally excluded (1 tap away already).
// Lock state is evaluated at render time via isPathLocked so modules.ts is
// the single source of truth — no manual enabled flags needed here.
interface MoreItem extends NavItem {
  enabled?: boolean   // false = module not in production (Marketing)
  adminOnly?: boolean
}
const MORE_ITEMS: { section: string; items: MoreItem[] }[] = [
  {
    section: "Productividad",
    items: [
      { href: "/productividad/tareas",     label: "Tareas",     Icon: ListChecks },
      { href: "/productividad/negocios",   label: "Negocios",   Icon: BarChart3 },
      { href: "/productividad/calendario", label: "Calendario", Icon: Calendar },
    ],
  },
  {
    section: "Operación",
    items: [
      { href: "/consultas",     label: "Consultas",      Icon: Search },
      { href: "/firmas",        label: "Firmas",         Icon: PenLine },
      { href: "/procedimientos",label: "Procedimientos", Icon: BookOpen },
      { href: "/correo",        label: "Correo",         Icon: Mail },
    ],
  },
  {
    section: "Administración",
    items: [
      { href: "/documentacion",        label: "Documentación", Icon: FileText,  adminOnly: true },
      { href: "/ventas",               label: "Ventas",        Icon: DollarSign, adminOnly: true },
      { href: "/servicios/dashboard",  label: "Servicios",     Icon: Wallet,     adminOnly: true },
      { href: "/marketing",            label: "Marketing",     Icon: BarChart3,  adminOnly: true, enabled: false },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(href + "/")
}

export function MobileNav({ role, email }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [theme, setThemeState] = useState<"light" | "dark">("dark")

  useEffect(() => {
    setThemeState(getTheme())
    const handler = () => setThemeState(getTheme())
    window.addEventListener("theme-change", handler)
    return () => window.removeEventListener("theme-change", handler)
  }, [])

  async function handleLogout() {
    resetAllStores()
    setMoreOpen(false)
    await fetch("/api/auth", { method: "DELETE" })
    router.push("/login")
  }

  return (
    <>
      <nav
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        className="fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-xl border-t border-border-subtle z-50 lg:hidden"
      >
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                scroll={false}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors",
                  active ? "text-brand-gold" : "text-text-muted hover:text-text-primary",
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-brand-gold" />
                )}
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn("text-[10px] leading-none", active ? "font-bold" : "font-medium")}>
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Más — full module directory */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors no-tap-target",
                  moreOpen ? "text-brand-gold" : "text-text-muted hover:text-text-primary",
                )}
              >
                {moreOpen && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-brand-gold" />
                )}
                <MoreHorizontal size={22} strokeWidth={moreOpen ? 2.2 : 1.8} />
                <span className={cn("text-[10px] leading-none", moreOpen ? "font-bold" : "font-medium")}>
                  Más
                </span>
              </button>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0">
              <SheetTitle className="sr-only">Módulos</SheetTitle>

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-border-strong/40" />
              </div>

              {/* Identity header */}
              <div className="flex items-center gap-3 px-5 pb-4">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-brand-navy flex items-center justify-center shrink-0">
                  <Image
                    src="/logo-pequeno.png"
                    alt="Freire"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{email}</p>
                  <p className="text-xs text-text-muted capitalize">{role}</p>
                </div>
              </div>

              <Separator />

              {/* Module directory */}
              <div className="px-5 py-4 space-y-5">
                {MORE_ITEMS.map((section) => {
                  const visibleItems = section.items.filter(
                    (it) => !it.adminOnly || role === "admin",
                  )
                  if (visibleItems.length === 0) return null
                  return (
                    <div key={section.section}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted mb-1.5 px-1">
                        {section.section}
                      </p>
                      <div className="grid grid-cols-1 gap-0.5">
                        {visibleItems.map(({ href, label, Icon, enabled = true }) => {
                          const active = isActive(pathname, href)
                          // Phase-locked for this role OR not in production → disabled.
                          // enabled:false = dev stub ("En desarrollo").
                          // isPathLocked = phase rollout ("Próximamente").
                          const phaseLocked = isPathLocked(href, role)
                          const disabled = !enabled || phaseLocked

                          if (disabled) {
                            return (
                              <div
                                key={href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-45 cursor-not-allowed"
                              >
                                <Icon size={18} strokeWidth={1.8} className="text-text-muted shrink-0" />
                                <span className="text-sm text-text-muted flex-1">{label}</span>
                                <span
                                  className={cn(
                                    "shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                                    phaseLocked
                                      ? "text-amber-400 bg-amber-500/10"
                                      : "text-text-muted bg-surface-2",
                                  )}
                                >
                                  {phaseLocked ? "Próximamente" : "En desarrollo"}
                                </span>
                              </div>
                            )
                          }

                          return (
                            <Link
                              key={href}
                              href={href}
                              scroll={false}
                              onClick={() => setMoreOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                active
                                  ? "bg-brand-navy/15 text-brand-gold"
                                  : "text-text-primary hover:bg-surface-overlay-hover",
                              )}
                            >
                              <Icon
                                size={18}
                                strokeWidth={active ? 2 : 1.8}
                                className={cn("shrink-0", active ? "text-brand-gold" : "text-text-secondary")}
                              />
                              <span className="text-sm font-medium flex-1">{label}</span>
                              <ChevronRight size={16} className="text-text-muted shrink-0" />
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Separator />

              {/* Settings */}
              <div className="px-5 py-4 space-y-1 pb-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2 px-1">
                  Configuración
                </p>
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme()
                    setThemeState(getTheme())
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-text-primary hover:bg-surface-overlay-hover transition-colors"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                  <span className="text-sm font-medium flex-1 text-left">
                    Tema {theme === "dark" ? "claro" : "oscuro"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium flex-1 text-left">Cerrar sesión</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  )
}
