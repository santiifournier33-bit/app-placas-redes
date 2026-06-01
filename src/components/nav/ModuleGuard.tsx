"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import type { UserRole } from "@/lib/auth/session"
import { isPathLocked } from "@/lib/auth/modules"

/**
 * Route-level safety net for the soft rollout. If the current role is
 * phase-locked out of this path (lockedFor in modules.ts), redirect to the
 * dashboard. Children are NOT mounted while locked, so the blocked module's
 * own effects (e.g. Correo IMAP, Firmas DocuSeal calls) never fire on a
 * direct-URL hit. The nav already hides these as "Próximamente"; this just
 * covers someone typing/bookmarking the URL.
 */
export function ModuleGuard({
  role,
  children,
}: {
  role: UserRole
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const locked = isPathLocked(pathname, role)

  useEffect(() => {
    if (locked) router.replace("/dashboard")
  }, [locked, router])

  if (locked) return null
  return <>{children}</>
}
