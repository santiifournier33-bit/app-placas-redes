"use client"

import { useState, useEffect } from "react"
import { SideNav } from "./SideNav"
import { MobileNav } from "./MobileNav"
import { ContextualFAB } from "./ContextualFAB"
import { PushBanner } from "@/components/push/PushBanner"
import { SidebarProvider } from "./SidebarContext"
import type { UserRole } from "@/lib/auth/session"
import { initTheme } from "@/lib/theme"

interface AppShellProps {
  role: UserRole
  email: string
  children: React.ReactNode
}

// Detect on-screen keyboard via visualViewport API. Returns true when the
// visible viewport height is meaningfully shorter than the layout viewport,
// which on iOS/Android means the soft keyboard has come up. Used to hide
// the bottom nav so it doesn't sit on top of focused inputs.
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport
    if (!vv) return // unsupported (very old browsers) — bottom nav stays put
    const KEYBOARD_THRESHOLD_PX = 150
    const handle = () => {
      const heightDiff = window.innerHeight - vv.height
      setOpen(heightDiff > KEYBOARD_THRESHOLD_PX)
    }
    handle()
    vv.addEventListener("resize", handle)
    vv.addEventListener("scroll", handle)
    return () => {
      vv.removeEventListener("resize", handle)
      vv.removeEventListener("scroll", handle)
    }
  }, [])
  return open
}

export function AppShell({ role, email, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const keyboardOpen = useKeyboardOpen()

  useEffect(() => {
    initTheme()
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
        {/* Bottom nav + FAB slide off-screen when the on-screen keyboard is
            open so they don't cover the focused input. transform on this
            wrapper translates the fixed-position children (it becomes a
            containing block for the fixed descendants). */}
        <div
          className={`transition-transform duration-200 ${keyboardOpen ? "translate-y-full" : ""}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <ContextualFAB />
          <MobileNav role={role} email={email} />
        </div>
        <PushBanner />
      </div>
    </SidebarProvider>
  )
}
