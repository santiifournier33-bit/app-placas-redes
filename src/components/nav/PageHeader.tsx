"use client"

import Link from "next/link"
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, ChevronRight } from "lucide-react"
import { ReactNode, useState, useEffect, Fragment } from "react"
import { useSidebar } from "./SidebarContext"
import { getTheme, toggleTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

export interface CrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  // Optional breadcrumb. Pass either a ReactNode for full control or an
  // array of items rendered with the built-in Crumbs component.
  breadcrumb?: ReactNode | CrumbItem[]
  // Action slot — kept opaque on purpose so consumers stay in control of
  // their primary/secondary action mix. Recommended: ≤3 buttons visible,
  // overflow goes into a shadcn DropdownMenu the consumer renders.
  actions?: ReactNode
  className?: string
}

// Small helper so a route can pass a list of crumb items without re-implementing
// the chevron + Link pattern in every page.
function Crumbs({ items }: { items: CrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-[11px] text-text-muted">
      {items.map((c, i) => {
        const last = i === items.length - 1
        return (
          <Fragment key={`${c.label}-${i}`}>
            {c.href && !last ? (
              <Link href={c.href} className="hover:text-text-secondary transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "text-text-secondary font-medium" : ""}>{c.label}</span>
            )}
            {!last && <ChevronRight size={11} className="text-text-muted/60 shrink-0" />}
          </Fragment>
        )
      })}
    </nav>
  )
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  className = "",
}: PageHeaderProps) {
  const { collapsed, toggle } = useSidebar()
  const [theme, setThemeState] = useState<"light" | "dark">("dark")

  useEffect(() => {
    setThemeState(getTheme())
    const handler = () => setThemeState(getTheme())
    window.addEventListener("theme-change", handler)
    return () => window.removeEventListener("theme-change", handler)
  }, [])

  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex items-center gap-3 px-4 border-b border-border-subtle shrink-0",
        "bg-shell-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-shell-surface/75",
        // h-14 when there's no breadcrumb; auto-grows when crumb row present.
        breadcrumb ? "py-2 min-h-14" : "h-14",
        className,
      )}
    >
      <button
        onClick={toggle}
        className="hidden lg:flex p-2 rounded-xl hover:bg-surface-overlay-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
        title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen size={18} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={18} strokeWidth={1.8} />
        )}
      </button>

      <div className="flex flex-col min-w-0 flex-1 leading-tight gap-0.5">
        {breadcrumb && (
          Array.isArray(breadcrumb) ? <Crumbs items={breadcrumb} /> : breadcrumb
        )}
        <h1 className="text-sm font-bold text-text-primary truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-[11px] text-text-muted truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-surface-overlay-hover hover:text-text-primary text-text-muted transition-colors cursor-pointer"
          title={`Cambiar a tema ${theme === "light" ? "oscuro" : "claro"}`}
          aria-label="Cambiar tema"
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

export { Crumbs }
