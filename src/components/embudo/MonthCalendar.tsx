"use client"

import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  addMonths, isSameMonth, isSameDay, format,
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toISODate } from "@/lib/embudo/funnel"

interface MonthCalendarProps {
  /** Any date within the displayed month. */
  month: Date
  /** Selected day (yyyy-MM-dd). */
  selected?: string | null
  onSelectDate?: (iso: string) => void
  onMonthChange?: (d: Date) => void
  /** iso date → array of dot colors to render under the day. */
  dots?: Record<string, string[]>
  /** First day of week: 0 = domingo (default), 1 = lunes. */
  weekStartsOn?: 0 | 1
  /** Sin card externa (border/rounded/padding grande) — para anidar en otro panel. */
  bare?: boolean
}

const WEEKDAYS_SUN = ["D", "L", "M", "M", "J", "V", "S"]
const WEEKDAYS_MON = ["L", "M", "M", "J", "V", "S", "D"]

export function MonthCalendar({ month, selected, onSelectDate, onMonthChange, dots, weekStartsOn = 0, bare = false }: MonthCalendarProps) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn })
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdays = weekStartsOn === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN

  return (
    <div className={bare ? "" : "rounded-2xl border border-border-subtle bg-surface-1 p-4"}>
      <div className={`flex items-center justify-between ${bare ? "mb-2" : "mb-3"}`}>
        <h3 className={`font-bold text-text-primary capitalize ${bare ? "text-[13px]" : "text-sm"}`}>
          {format(month, "MMMM yyyy", { locale: es })}
        </h3>
        {onMonthChange && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMonthChange(addMonths(month, -1))}
              className="p-1.5 rounded-lg hover:bg-surface-overlay-hover text-text-muted hover:text-text-primary cursor-pointer"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(addMonths(month, 1))}
              className="p-1.5 rounded-lg hover:bg-surface-overlay-hover text-text-muted hover:text-text-primary cursor-pointer"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${bare ? "mb-0.5" : "mb-1"}`}>
        {weekdays.map((d, i) => (
          <div key={i} className={`text-center text-[10px] font-bold text-text-muted uppercase ${bare ? "py-0.5" : "py-1"}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const iso = toISODate(day)
          const inMonth = isSameMonth(day, month)
          const isSelected = selected ? isSameDay(day, new Date(`${selected}T12:00:00`)) : false
          const dayDots = dots?.[iso] ?? []
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate?.(iso)}
              disabled={!onSelectDate}
              className={`relative rounded-lg flex flex-col items-center justify-center transition-colors ${
                bare ? "h-8 text-[13px]" : "aspect-square text-xs"
              } ${
                onSelectDate ? "cursor-pointer" : "cursor-default"
              } ${
                isSelected
                  ? "bg-shell-accent text-shell-bg font-bold"
                  : inMonth
                    ? "text-text-primary hover:bg-surface-overlay-hover"
                    : "text-text-disabled"
              }`}
            >
              <span className="tabular-nums">{format(day, "d")}</span>
              {dayDots.length > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dayDots.slice(0, 4).map((c, i) => (
                    <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? "var(--shell-bg)" : c }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
