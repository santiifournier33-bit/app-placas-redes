"use client"

import { useState } from "react"
import { useDolarRate } from "@/lib/servicios/useDolarRate"
import { X, DollarSign, Loader2 } from "lucide-react"

export function DolarRateSync() {
  const { loading, error, needsManual, manualSet } = useDolarRate()
  const [manualValue, setManualValue] = useState("")
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  if (loading) {
    return (
      <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2 text-xs text-zinc-600">
        <Loader2 size={12} className="animate-spin" />
        Actualizando cotización dólar...
      </div>
    )
  }

  if (!needsManual) return null

  const handleManualSave = () => {
    const val = parseFloat(manualValue)
    if (!isNaN(val) && val > 0) {
      manualSet(val)
      setDismissed(true)
    }
  }

  return (
    <div className="mx-4 mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs">
      <DollarSign size={14} className="text-amber-400 shrink-0" />
      <div className="flex-1">
        <p className="text-amber-200 font-medium">No se pudo obtener cotización del dólar</p>
        {error && <p className="text-zinc-500 mt-0.5">{error}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-zinc-400">Blue compra:</span>
          <input
            type="number"
            min="1"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSave()}
            placeholder="Ej: 1200"
            className="w-24 px-2 py-1 bg-white/[0.06] border border-white/[0.1] rounded-lg text-zinc-200 placeholder-zinc-600"
          />
          <button
            onClick={handleManualSave}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="text-zinc-500 hover:text-zinc-300 shrink-0 cursor-pointer">
        <X size={14} />
      </button>
    </div>
  )
}
