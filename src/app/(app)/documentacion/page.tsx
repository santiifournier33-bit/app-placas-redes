import { FolderOpen } from "iconsax-react"

export default function DocumentacionPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <FolderOpen size={24} className="text-shell-accent" />
        <h1 className="text-2xl font-bold text-shell-text">Documentación</h1>
      </div>
      <p className="text-shell-text-muted text-sm mb-8">
        Archivos y documentos de propiedades sincronizados desde Tokko Broker.
      </p>
      <div className="rounded-2xl border border-shell-border bg-shell-surface p-12 text-center">
        <p className="text-shell-text-muted text-sm">Módulo en desarrollo</p>
      </div>
    </div>
  )
}
