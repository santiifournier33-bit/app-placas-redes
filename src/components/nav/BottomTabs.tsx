"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import type { UserRole } from "@/lib/auth/session"
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
        className="fixed bottom-0 left-0 right-0 bg-shell-surface/95 backdrop-blur-xl border-t border-shell-border z-50 lg:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-stretch px-2 pt-1.5 pb-2">

          {/* Home */}
          <Link
            href="/dashboard"
            scroll={false}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl text-[10px] font-medium transition-all cursor-pointer ${
              homeActive ? "text-blue-400" : "text-zinc-500"
            }`}
          >
            <LayoutDashboard size={22} strokeWidth={1.8} className={homeActive ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : ""} />
            <span>Home</span>
          </Link>

          {/* Productividad */}
          <Link
            href="/productividad/tareas"
            scroll={false}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl text-[10px] font-medium transition-all cursor-pointer ${
              prodActive ? "text-blue-400" : "text-zinc-500"
            }`}
          >
            <ListTodo size={22} strokeWidth={1.8} className={prodActive ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : ""} />
            <span>Productividad</span>
          </Link>

          {/* Diseño */}
          <Link
            href="/diseno"
            scroll={false}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl text-[10px] font-medium transition-all cursor-pointer ${
              disenActive ? "text-blue-400" : "text-zinc-500"
            }`}
          >
            <Paintbrush size={22} strokeWidth={1.8} className={disenActive ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : ""} />
            <span>Diseño</span>
          </Link>

          {/* Apps */}
          <button
            onClick={() => setAppsOpen(true)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl text-[10px] font-medium transition-all cursor-pointer ${
              appsOpen ? "text-blue-400" : "text-zinc-500"
            }`}
          >
            <Grid3x3 size={22} strokeWidth={1.8} className={appsOpen ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : ""} />
            <span>Apps</span>
          </button>

        </div>
      </nav>

      {/* Apps Drawer (full-screen overlay) */}
      {appsOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setAppsOpen(false)}
          />

          {/* Sheet slides up from bottom */}
          <div className="relative mt-auto bg-[#0D0D14] border-t border-white/[0.08] rounded-t-3xl max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-base font-bold text-shell-text">Apps</h2>
              <button
                onClick={() => setAppsOpen(false)}
                className="p-2 hover:bg-white/[0.06] rounded-xl cursor-pointer"
              >
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* Sections */}
            <div className="px-4 pb-8 space-y-6">
              {APPS_SECTIONS.map(section => (
                <div key={section.title}>
                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.12em] mb-3 px-1">
                    {section.title}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {section.items.map(item => {
                      const Icon = item.icon
                      const active = pathname === item.href || pathname.startsWith(item.href + "/")
                      const disabled = !section.enabled

                      if (disabled) {
                        return (
                          <div
                            key={item.href}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl opacity-30 cursor-not-allowed"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                              <Icon size={22} strokeWidth={1.5} className="text-zinc-600" />
                            </div>
                            <span className="text-[10px] text-zinc-600 text-center leading-tight">{item.label}</span>
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          scroll={false}
                          onClick={() => setAppsOpen(false)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95 cursor-pointer ${
                            active ? "bg-blue-500/10" : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
                            active
                              ? "bg-blue-500/20 border-blue-500/30"
                              : "bg-white/[0.04] border-white/[0.06]"
                          }`}>
                            <Icon
                              size={22}
                              strokeWidth={1.5}
                              className={active ? "text-blue-400" : "text-zinc-300"}
                            />
                          </div>
                          <span className={`text-[10px] text-center leading-tight ${
                            active ? "text-blue-400 font-medium" : "text-zinc-400"
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
          </div>
        </div>
      )}
    </>
  )
}
