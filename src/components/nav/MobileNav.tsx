"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { UserRole } from "@/lib/auth/session"
import {
  ListChecks, Users, Search, Palette, MoreHorizontal,
  FileText, DollarSign, Wallet,
  LayoutDashboard, MessageCircleQuestion, BookOpen, PenLine,
  Mail, BarChart3,
  Sun, Moon, LogOut, ChevronRight,
} from "lucide-react"
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { resetAllStores } from "@/lib/stores/resetAllStores"
import { getTheme, toggleTheme } from "@/lib/theme"

interface MobileNavProps {
  role: UserRole
  email: string
}

interface NavItem {
  href: string
  label: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

// Primary 4 + "Más" per role. Order = thumb-zone priority (leftmost = most-used).
const NAV_ASESOR: NavItem[] = [
  { href: "/productividad/tareas",     label: "Tareas",    Icon: ListChecks },
  { href: "/productividad/contactos",  label: "Contactos", Icon: Users },
  { href: "/consultas",                label: "Consultas", Icon: Search },
  { href: "/diseno",                   label: "Diseño",    Icon: Palette },
]

const NAV_ADMIN: NavItem[] = [
  { href: "/productividad/tareas",     label: "Tareas",    Icon: ListChecks },
  { href: "/documentacion",            label: "Docs",      Icon: FileText },
  { href: "/ventas",                   label: "Ventas",    Icon: DollarSign },
  { href: "/servicios",                label: "Servicios", Icon: Wallet },
]

// "Más" sheet: rest of modules grouped by category. Disabled items kept visible
// but greyed (consistent with sidebar).
interface MoreItem extends NavItem {
  enabled?: boolean
  adminOnly?: boolean
}
const MORE_ITEMS: { section: string; items: MoreItem[] }[] = [
  {
    section: "Atajos",
    items: [
      { href: "/dashboard",               label: "Dashboard",       Icon: LayoutDashboard },
      { href: "/productividad/negocios",  label: "Negocios",        Icon: BarChart3 },
      { href: "/productividad/calendario",label: "Calendario",      Icon: BookOpen },
    ],
  },
  {
    section: "Operación",
    items: [
      { href: "/consultas",               label: "Consultas",       Icon: Search },
      { href: "/correo",                  label: "Correo",          Icon: Mail },
      { href: "/firmas",                  label: "Firmas",          Icon: PenLine },
      { href: "/procedimientos",          label: "Procedimientos",  Icon: BookOpen },
    ],
  },
  {
    section: "Administración",
    items: [
      { href: "/documentacion",           label: "Documentación",   Icon: FileText,       adminOnly: true },
      { href: "/ventas",                  label: "Ventas",          Icon: DollarSign,     adminOnly: true },
      { href: "/servicios",               label: "Servicios",       Icon: Wallet,         adminOnly: true },
      { href: "/marketing",               label: "Marketing",       Icon: MessageCircleQuestion, adminOnly: true, enabled: false },
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

  const items = role === "admin" ? NAV_ADMIN : NAV_ASESOR

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
          {items.map(({ href, label, Icon }) => {
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

          {/* Más trigger */}
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
              {/* Hidden title for a11y */}
              <SheetTitle className="sr-only">Más opciones</SheetTitle>

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-border-strong/40" />
              </div>

              {/* Header con logo + identidad */}
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

              {/* Secciones */}
              <div className="px-5 py-4 space-y-6">
                {MORE_ITEMS.map((section) => {
                  const visibleItems = section.items.filter(
                    (it) => !it.adminOnly || role === "admin",
                  )
                  if (visibleItems.length === 0) return null
                  return (
                    <div key={section.section}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2 px-1">
                        {section.section}
                      </p>
                      <div className="grid grid-cols-1 gap-1">
                        {visibleItems.map(({ href, label, Icon, enabled = true }) => {
                          const active = isActive(pathname, href)
                          const disabled = !enabled
                          if (disabled) {
                            return (
                              <div
                                key={href}
                                className="flex items-center gap-3 px-3 py-3 rounded-lg opacity-40 cursor-not-allowed"
                              >
                                <Icon size={18} strokeWidth={1.8} className="text-text-muted" />
                                <span className="text-sm text-text-muted flex-1">{label}</span>
                                <span className="text-[10px] text-text-muted">próx.</span>
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
                                "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                                active
                                  ? "bg-brand-navy/15 text-brand-gold"
                                  : "text-text-primary hover:bg-surface-overlay-hover",
                              )}
                            >
                              <Icon
                                size={18}
                                strokeWidth={active ? 2 : 1.8}
                                className={active ? "text-brand-gold" : "text-text-secondary"}
                              />
                              <span className="text-sm font-medium flex-1">{label}</span>
                              <ChevronRight size={16} className="text-text-muted" />
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Separator />

              {/* Configuración */}
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
