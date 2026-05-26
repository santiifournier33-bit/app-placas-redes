import { DollarSign } from "lucide-react"
import VentasModule from "@/components/ventas/VentasModule"

export default function VentasPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <DollarSign size={24} className="text-shell-accent" />
        <h1 className="text-2xl font-bold text-text-primary">Ventas</h1>
      </div>
      <p className="text-text-muted text-sm mb-8">
        Operaciones, comisiones, facturación y balance del equipo.
      </p>
      
      <VentasModule />
    </div>
  )
}
