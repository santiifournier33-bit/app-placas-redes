"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { getModulesForRole, type ModuleDefinition } from "@/lib/auth/modules"
import type { UserRole } from "@/lib/auth/session"
import {
  Paintbrush, ListTodo, MessageCircleQuestion, BookOpen,
  FolderOpen, BarChart3, DollarSign, Receipt, Mail,
  LogOut, Lock
} from "lucide-react"
import type { ReactNode } from "react"

function getIcon(iconName: string, size: number): ReactNode {
  const props = { size, strokeWidth: 1.8 }
  switch (iconName) {
    case 'Brush2': return <Paintbrush {...props} />
    case 'TaskSquare': return <ListTodo {...props} />
    case 'MessageQuestion': return <MessageCircleQuestion {...props} />
    case 'Book1': return <BookOpen {...props} />
    case 'FolderOpen': return <FolderOpen {...props} />
    case 'Chart': return <BarChart3 {...props} />
    case 'DollarSquare': return <DollarSign {...props} />
    case 'Receipt1': return <Receipt {...props} />
    case 'Sms': return <Mail {...props} />
    default: return null
  }
}

interface SideNavProps {
  role: UserRole
  email: string
}

export function SideNav({ role, email }: SideNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const allModules = getModulesForRole(role)

  const sharedModules = allModules.filter(m => m.access.includes('asesor'))
  const adminModules = allModules.filter(m => !m.access.includes('asesor'))

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#0A0A0F]/90 backdrop-blur-xl border-r border-white/[0.06] z-50">
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.06]">
        <Link href="/diseno" className="flex items-center gap-3 cursor-pointer">
          <Image
            src="/logo-pequeno.png"
            alt="Freire Propiedades"
            width={100}
            height={32}
            className="object-contain brightness-0 invert opacity-90"
          />
        </Link>
        <p className="text-zinc-500 text-[11px] mt-2 font-medium tracking-wide">
          Plataforma Interna
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sharedModules.map((mod) => (
          <NavItem key={mod.id} mod={mod} pathname={pathname} />
        ))}

        {adminModules.length > 0 && (
          <>
            <div className="pt-5 pb-2 px-3">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">
                Administración
              </span>
            </div>
            {adminModules.map((mod) => (
              <NavItem key={mod.id} mod={mod} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06] space-y-2 bg-gradient-to-t from-black/30 to-transparent">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
          <span className="text-[11px] font-medium text-zinc-500 truncate">
            {email}
          </span>
          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-blue-400/80 bg-blue-500/15 px-1.5 py-0.5 rounded">
            {role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} strokeWidth={1.8} className="group-hover:-translate-x-1 transition-transform duration-300" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

function NavItem({ mod, pathname }: { mod: ModuleDefinition; pathname: string }) {
  const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
  const disabled = !mod.enabled

  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 cursor-not-allowed">
        {getIcon(mod.icon, 18)}
        <span>{mod.label}</span>
        <Lock size={12} strokeWidth={2} className="ml-auto text-zinc-700" />
      </div>
    )
  }

  return (
    <Link
      href={mod.href}
      scroll={false}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden cursor-pointer ${
        active
          ? "text-blue-400 bg-blue-500/10 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.15)]"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      )}
      {getIcon(mod.icon, 18)}
      {mod.label}
    </Link>
  )
}
