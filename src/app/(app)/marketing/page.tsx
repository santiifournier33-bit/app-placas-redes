import { Chart } from "iconsax-react"

export default function MarketingPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Chart size={24} className="text-shell-accent" />
        <h1 className="text-2xl font-bold text-text-primary">Marketing</h1>
      </div>
      <p className="text-text-muted text-sm mb-8">
        Dashboard de marketing: campañas, embudo, pipeline y métricas.
      </p>
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-12 text-center">
        <p className="text-text-muted text-sm">Módulo en desarrollo</p>
      </div>
    </div>
  )
}
