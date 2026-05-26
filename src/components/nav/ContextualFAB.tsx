"use client"

import { usePathname, useRouter } from "next/navigation"
import { Plus, MessageCircle, Send, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Each route can define a primary mobile action. Two emission strategies:
//   1. `href`        → simple navigation (e.g. composer page).
//   2. `eventName`   → dispatch a window CustomEvent that the page listens for
//                      to open its own create modal/sheet. Keeps FAB decoupled
//                      from per-module state.
interface FabAction {
  match: (pathname: string) => boolean
  label: string
  Icon: LucideIcon
  href?: string
  eventName?: string
  variant?: "default" | "whatsapp"
}

const FAB_ACTIONS: FabAction[] = [
  {
    match: (p) => p.startsWith("/productividad/tareas"),
    label: "Nueva tarea",
    Icon: Plus,
    eventName: "fab:new-task",
  },
  {
    match: (p) => p.startsWith("/productividad/contactos") && !p.includes("/contactos/"),
    label: "Nuevo contacto",
    Icon: Plus,
    eventName: "fab:new-contact",
  },
  {
    match: (p) => p.startsWith("/productividad/negocios"),
    label: "Nuevo negocio",
    Icon: Plus,
    eventName: "fab:new-opportunity",
  },
  {
    match: (p) => p.startsWith("/consultas/") && p !== "/consultas",
    label: "WhatsApp",
    Icon: MessageCircle,
    eventName: "fab:whatsapp",
    variant: "whatsapp",
  },
  {
    match: (p) => p === "/correo" || p.startsWith("/correo/"),
    label: "Nuevo email",
    Icon: Send,
    eventName: "fab:new-email",
  },
  // Diseño removed: the primary action ("Publicar") depends on whether a
  // property is loaded inside PropertyExplorer (deep client state, not URL).
  // Surfacing a FAB that no-ops 80% of the time is worse than no FAB.
  // Re-introduce if /diseno/[propertyId] becomes a real route.
  {
    match: (p) => p === "/servicios/gastos" || p === "/servicios/ingresos",
    label: "Nuevo movimiento",
    Icon: Plus,
    eventName: "fab:new-payment",
  },
]

export function ContextualFAB() {
  const pathname = usePathname()
  const router = useRouter()
  const action = FAB_ACTIONS.find((a) => a.match(pathname))
  if (!action) return null

  const handle = () => {
    if (action.href) {
      router.push(action.href)
    } else if (action.eventName) {
      window.dispatchEvent(new CustomEvent(action.eventName))
    }
  }

  const variantClass =
    action.variant === "whatsapp"
      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
      : "bg-brand-navy hover:bg-brand-navy-700 text-white"

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={action.label}
      className={cn(
        // Sits above the bottom nav (which is ~64px tall + safe-area).
        "fixed right-4 z-40 lg:hidden",
        "size-14 rounded-full shadow-lg flex items-center justify-center transition-all",
        "active:scale-95",
        variantClass,
      )}
      style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
    >
      <action.Icon size={22} strokeWidth={2.2} />
      <span className="sr-only">{action.label}</span>
    </button>
  )
}
