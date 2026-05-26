"use client"

import { useState, useEffect } from "react"

/**
 * Returns true when the viewport width is below `breakpoint` pixels.
 * Listens for resize via matchMedia so the value updates live.
 * SSR-safe: defaults to false on the server.
 */
export function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [breakpoint])

  return isMobile
}
