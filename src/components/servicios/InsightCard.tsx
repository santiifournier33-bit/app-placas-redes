"use client"

import { Info, AlertTriangle, TrendingUp } from "lucide-react"
import type { Insight } from "@/lib/servicios/insights"

const ICONS = {
  info: <Info size={14} className="text-blue-400" />,
  warning: <AlertTriangle size={14} className="text-amber-400" />,
  success: <TrendingUp size={14} className="text-emerald-400" />,
}

const BG = {
  info: "bg-blue-500/10 border-blue-500/20",
  warning: "bg-amber-500/10 border-amber-500/20",
  success: "bg-emerald-500/10 border-emerald-500/20",
}

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${BG[insight.type]} min-w-[200px] shrink-0`}>
      {ICONS[insight.type]}
      <span className="text-xs text-zinc-300 font-medium">{insight.text}</span>
    </div>
  )
}
