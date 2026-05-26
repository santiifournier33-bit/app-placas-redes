"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import type { UserRole } from "@/lib/auth/session"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, ListTodo, Paintbrush, Grid3x3,
  Briefcase, Users, Contact, Calendar, CheckSquare,
  MessageCircleQuestion, BookOpen, FolderOpen,
  BarChart3, DollarSign, Receipt, Mail, X, Lock,
} from "lucide-react"

interface BottomTabsProps {
  role: UserRole
}

const PROD_SUB_APPS = [
  { href: "/productividad/tareas", label: "Tareas", icon: CheckSquare },
  { href: "/productividad/negocios", label: "Negocios", icon: Briefcase },
  { href: "/productividad/equipo", label: "Equipo", icon: Users },
  { href: "/productividad/contactos", label: "Contactos", icon: Contact },
  { href: "/productividad/calendario", label: "Calendario", icon: Calendar },
]

const APPS_SECTIONS = [
  {
    title: "Productividad",
    items: PROD_SUB_APPS,
    enabled: true,
  },
  {
    title: "Diseño",
    items: [{ href: "/diseno", label: "Diseño", icon: Paintbrush }],
    enabled: true,
  },
  {
    title: "Próximamente",
    items: [
      { href: "/consultas", label: "Consultas", icon: MessageCircleQuestion },
      { href: "/procedimientos", label: "Procedimientos", icon: BookOpen },
      { href: "/documentacion", label: "Documentación", icon: FolderOpen },
      { href: "/marketing", label: "Marketing", icon: BarChart3 },
      { href: "/ventas", label: "Ventas", icon: DollarSign },
      { href: "/servicios", label: "Servicios", icon: Receipt },
      { href: "/correo", label: "Correo", icon: Mail },
    ],
    enabled: false,
  },
]

export function BottomTabs({ role }: BottomTabsProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [appsOpen, setAppsOpen] = useState(false)

  const homeActive = pathname === "/dashboard"
  const prodActive = pathname.startsWith("/productividad")
  const disenActive = pathname.startsWith("/diseno")

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        className="fixed bottom-0 left-0 right-0 bg-surface-1/90 backdrop-blur-xl border-t border-border-subtle z-50 lg:hidden shadow-[0_-8px_32px_rgba(0,0,0,0.15)]"
      >
        <div className="flex items-stretch px-4 pt-1.5 pb-2">

          {/* Home */}
          <Link
            href="/dashboard"
            scroll={false}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs md:text-[10px] font-semibold transition-all duration-200 min-h-[48px] ${
              homeActive ? "text-shell-accent" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <LayoutDashboard size={20} strokeWidth={2} className={`transition-transform duration-200 ${homeActive ? "scale-110 drop-shadow-[0_0_8px_var(--color-shell-accent-muted)]" : ""}`} />
            <span>Home</span>
          </Link>

          {/* Productividad */}
          <Link
            href="/productividad/tareas"
            scroll={false}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs md:text-[10px] font-semibold transition-all duration-200 min-h-[48px] ${
              prodActive ? "text-shell-accent" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <ListTodo size={20} strokeWidth={2} className={`transition-transform duration-200 ${prodActive ? "scale-110 drop-shadow-[0_0_8px_var(--color-shell-accent-muted)]" : ""}`} />
            <span>Productividad</span>
          </Link>

          {/* Diseño */}
          <Link
            href="/diseno"
            scroll={false}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs md:text-[10px] font-semibold transition-all duration-200 min-h-[48px] ${
              disenActive ? "text-shell-accent" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Paintbrush size={20} strokeWidth={2} className={`transition-transform duration-200 ${disenActive ? "scale-110 drop-shadow-[0_0_8px_var(--color-shell-accent-muted)]" : ""}`} />
            <span>Diseño</span>
          </Link>

          {/* Apps */}
          <button
            onClick={() => setAppsOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs md:text-[10px] font-semibold transition-all duration-200 min-h-[48px] cursor-pointer ${
              appsOpen ? "text-shell-accent" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Grid3x3 size={20} strokeWidth={2} className={`transition-transform duration-200 ${appsOpen ? "scale-110 drop-shadow-[0_0_8px_var(--color-shell-accent-muted)]" : ""}`} />
            <span>Apps</span>
          </button>

        </div>
      </nav>

      {/* Apps Drawer (full-screen overlay) */}
      <AnimatePresence>
        {appsOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden flex flex-col">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAppsOpen(false)}
            />

            {/* Sheet slides up from bottom */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
              className="relative mt-auto bg-surface-1 border-t border-border-subtle rounded-t-[2.5rem] max-h-[85vh] overflow-y-auto shadow-[0_-12px_40px_rgba(0,0,0,0.3)] z-10"
            >
              {/* Handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-shell-text-muted/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-base font-bold text-text-primary">Herramientas</h2>
                <button
                  onClick={() => setAppsOpen(false)}
                  className="p-2 hover:bg-surface-2 rounded-xl cursor-pointer transition-colors"
                >
                  <X size={18} className="text-text-muted" />
                </button>
              </div>

              {/* Sections */}
              <div className="px-6 space-y-8">
                {APPS_SECTIONS.map(section => (
                  <div key={section.title} className="space-y-4">
                    <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] px-1">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {section.items.map(item => {
                        const Icon = item.icon
                        const active = pathname === item.href || pathname.startsWith(item.href + "/")
                        const disabled = !section.enabled

                        if (disabled) {
                          return (
                            <div
                              key={item.href}
                              className="flex flex-col items-center gap-2 p-3 rounded-2xl opacity-30 cursor-not-allowed select-none bg-surface-2/30 border border-transparent"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-shell-text-muted/10 flex items-center justify-center">
                                <Icon size={20} strokeWidth={1.5} className="text-text-muted" />
                              </div>
                              <span className="text-xs md:text-[10px] text-text-muted text-center leading-tight font-medium">{item.label}</span>
                            </div>
                          )
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            scroll={false}
                            onClick={() => setAppsOpen(false)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 cursor-pointer border ${
                              active
                                ? "bg-shell-accent-muted border-shell-accent/20"
                                : "hover:bg-surface-2 border-transparent"
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                              active
                                ? "bg-shell-accent/20"
                                : "bg-surface-2"
                            }`}>
                              <Icon
                                size={20}
                                strokeWidth={1.5}
                                className={active ? "text-shell-accent" : "text-text-primary"}
                              />
                            </div>
                            <span className={`text-xs md:text-[10px] text-center leading-tight font-semibold ${
                              active ? "text-shell-accent" : "text-text-muted"
                            }`}>
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

