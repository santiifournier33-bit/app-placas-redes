"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/ui/error-state"

// Route-level error boundary for every (app) segment. Catches render/data
// errors so one failing module doesn't blank the whole shell; `reset` retries
// the segment without a full reload.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app/error]", error)
  }, [error])

  return (
    <div className="p-4 lg:p-6">
      <ErrorState
        title="No se pudo cargar esta sección"
        description="Ocurrió un error al mostrar el contenido. Reintentá; si persiste, recargá la página."
        onRetry={reset}
      />
    </div>
  )
}
