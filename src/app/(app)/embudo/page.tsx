import { Suspense } from "react"
import { Target } from "lucide-react"
import { getSession } from "@/lib/auth/session"
import EmbudoModule from "@/components/embudo/EmbudoModule"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default async function EmbudoPage() {
  const session = await getSession()
  const role = session?.role ?? "asesor"

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Target size={24} className="text-shell-accent" />
        <h1 className="text-2xl font-bold text-text-primary">Embudo</h1>
      </div>
      <p className="text-text-muted text-sm mb-8">
        Cargá tu actividad diaria y seguí tu embudo de ventas contra los objetivos del equipo.
      </p>

      <ErrorBoundary fallbackTitle="Error en el módulo de embudo" fallbackDescription="No se pudo cargar el tracker. Intentá de nuevo.">
        <Suspense fallback={null}>
          <EmbudoModule role={role} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
