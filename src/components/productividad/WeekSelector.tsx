"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addWeeks, subWeeks, startOfWeek, isThisWeek } from "date-fns"
import { es } from "date-fns/locale"

interface WeekSelectorProps {
  weekKey: string
  onChange: (weekKey: string) => void
}

export function WeekSelector({ weekKey, onChange }: WeekSelectorProps) {
  const weekDate = new Date(weekKey + "T00:00:00")
  const weekEnd = new Date(weekDate.getTime() + 6 * 86400000)
  const current = isThisWeek(weekDate, { weekStartsOn: 1 })

  const prev = () => {
    const d = subWeeks(weekDate, 1)
    onChange(format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"))
  }

  const next = () => {
    const d = addWeeks(weekDate, 1)
    onChange(format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"))
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
      <button onClick={prev} className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer">
        <ChevronLeft size={18} className="text-zinc-400" />
      </button>
      <div className="text-center">
        <p className="text-sm font-medium text-shell-text">
          {format(weekDate, "d MMM", { locale: es })} — {format(weekEnd, "d MMM", { locale: es })}
        </p>
        {current && (
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Semana actual</span>
        )}
      </div>
      <button onClick={next} className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer">
        <ChevronRight size={18} className="text-zinc-400" />
      </button>
    </div>
  )
}
