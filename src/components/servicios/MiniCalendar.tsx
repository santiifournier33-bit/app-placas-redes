"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, isSameDay,
  addMonths, subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { getPaymentStatus } from "@/lib/servicios/status"

interface MiniCalendarProps {
  onSelectDate?: (date: Date) => void
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]

export function MiniCalendar({ onSelectDate }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const { payments, categories } = useServiciosStore()
  const today = new Date()

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const paymentsByDate = useMemo(() => {
    const map = new Map<string, { color: string; status: string }[]>()
    payments.forEach((p) => {
      const key = p.dueDate.slice(0, 10)
      const cat = categories.find((c) => c.id === p.categoryId)
      const status = getPaymentStatus(p, today)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ color: cat?.color ?? "#64748b", status })
    })
    return map
  }, [payments, categories, today])

  const selectedPayments = useMemo(() => {
    if (!selectedDate) return []
    const key = format(selectedDate, "yyyy-MM-dd")
    return payments.filter((p) => p.dueDate.slice(0, 10) === key)
  }, [selectedDate, payments])

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    onSelectDate?.(day)
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-overlay p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-text-primary capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-text-muted font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const dots = paymentsByDate.get(key) ?? []
          const inMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)

          return (
            <button
              key={key}
              onClick={() => handleDayClick(day)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? "bg-blue-500/20"
                  : isToday(day)
                    ? "bg-surface-overlay-hover"
                    : "hover:bg-surface-overlay"
              } ${inMonth ? "" : "opacity-30"}`}
            >
              <span className={`text-xs ${
                isToday(day) ? "text-blue-400 font-semibold" : inMonth ? "text-text-secondary" : "text-text-muted"
              }`}>
                {format(day, "d")}
              </span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dots.slice(0, 3).map((dot, i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: dot.status === "vencido" ? "#ef4444" : dot.status === "vence_hoy" ? "#f59e0b" : dot.color }}
                    />
                  ))}
                  {dots.length > 3 && <span className="w-1 h-1 rounded-full bg-zinc-500" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date payments */}
      {selectedDate && selectedPayments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-subtle space-y-1.5">
          <p className="text-xs text-text-muted font-medium capitalize">
            {format(selectedDate, "EEEE d MMMM", { locale: es })}
          </p>
          {selectedPayments.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId)
            const status = getPaymentStatus(p, today)
            return (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#64748b" }} />
                <span className="text-text-secondary flex-1 truncate">{cat?.name ?? "Sin categoría"}</span>
                <span className={`${status === "vencido" ? "text-red-400" : status === "pagado" ? "text-emerald-400" : "text-text-secondary"}`}>
                  {p.currency === "ARS" ? "$" : "US$"}{p.amount.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
