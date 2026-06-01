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
}

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"]

export function MonthCalendar({ month, selected, onSelectDate, onMonthChange, dots }: MonthCalendarProps) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text-primary capitalize">
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

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-text-muted uppercase py-1">{d}</div>
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
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
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
