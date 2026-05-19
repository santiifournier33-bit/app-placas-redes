"use client"

import { useState, useEffect } from "react"
import { SideNav } from "./SideNav"
import { BottomTabs } from "./BottomTabs"
import { PushBanner } from "@/components/push/PushBanner"
import { SidebarProvider } from "./SidebarContext"
import type { UserRole } from "@/lib/auth/session"

interface AppShellProps {
  role: UserRole
  email: string
  children: React.ReactNode
}

export function AppShell({ role, email, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev))
      return !prev
    })
  }

  return (
    <SidebarProvider value={{ collapsed, toggle }}>
      <div className="min-h-screen bg-shell-bg text-shell-text flex flex-col font-sans selection:bg-shell-accent/30">
        <SideNav role={role} email={email} collapsed={collapsed} />
        <main
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)", willChange: "margin" }}
          className={`transition-[margin] duration-300 pb-20 lg:pb-0 flex-1 relative ${
            collapsed ? "lg:ml-16" : "lg:ml-64"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.03] via-transparent to-violet-500/[0.02] pointer-events-none" />
          <div className="relative z-10">{children}</div>
        </main>
        <BottomTabs role={role} />
        <PushBanner />
      </div>
    </SidebarProvider>
  )
}
