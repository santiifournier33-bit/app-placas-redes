"use client"

import { createContext, useContext } from "react"

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({
  value,
  children,
}: {
  value: SidebarContextValue
  children: React.ReactNode
}) {
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (!ctx) return { collapsed: false, toggle: () => {} }
  return ctx
}
