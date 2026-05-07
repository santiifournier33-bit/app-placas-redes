"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { getModulesForRole } from "@/lib/auth/modules"
import type { UserRole } from "@/lib/auth/session"
import {
  Paintbrush, ListTodo, MessageCircleQuestion, BookOpen,
  FolderOpen, BarChart3, DollarSign, Receipt, Mail,
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

interface BottomTabsProps {
  role: UserRole
}

export function BottomTabs({ role }: BottomTabsProps) {
  const pathname = usePathname()
  const allModules = getModulesForRole(role).filter(m => m.enabled)
  const visibleTabs = allModules.slice(0, 4)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0F]/90 backdrop-blur-xl border-t border-white/[0.06] z-50 lg:hidden pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex px-2 pt-2 pb-1">
        {visibleTabs.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              scroll={false}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-2xl text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                active
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-zinc-500 hover:text-zinc-300 active:bg-white/[0.04]"
              }`}
            >
              <span className={active ? "drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]" : ""}>
                {getIcon(icon, 20)}
              </span>
              <span className="tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
