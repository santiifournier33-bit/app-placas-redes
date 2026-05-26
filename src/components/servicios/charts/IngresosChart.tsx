"use client"

import { useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  format, startOfYear, endOfYear, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachMonthOfInterval, eachWeekOfInterval,
  eachDayOfInterval, subYears, subMonths, subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import { useVentasIncome } from "@/lib/servicios/useVentasIncome"
import type { Period } from "./PeriodSelector"

interface IngresosChartProps {
  period: Period
}

function getIntervals(period: Period) {
  const today = new Date()
  switch (period) {
    case "year":
      return Array.from({ length: 3 }, (_, i) => {
        const y = subYears(today, 2 - i)
        return { start: startOfYear(y), end: endOfYear(y), label: format(y, "yyyy") }
      })
    case "month": {
      const start = subMonths(today, 11)
      return eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(today) }).map((d) => ({
        start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM yy", { locale: es }),
      }))
    }
    case "week": {
      const start = subWeeks(today, 7)
      return eachWeekOfInterval(
        { start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) },
        { weekStartsOn: 1 }
      ).map((d) => ({
        start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }),
        label: `S${format(d, "w")}`,
      }))
    }
    case "day":
      return eachDayOfInterval({ start: subWeeks(today, 2), end: today }).map((d) => ({
        start: d, end: d, label: format(d, "d/M"),
      }))
  }
}

export function IngresosChart({ period }: IngresosChartProps) {
  const intervals = useMemo(() => getIntervals(period), [period])
  const rangeStart = intervals[0]?.start ?? new Date()
  const rangeEnd = intervals[intervals.length - 1]?.end ?? new Date()

  const { data: incomeEntries, loading, error } = useVentasIncome(rangeStart, rangeEnd)

  const chartData = useMemo(() =>
    intervals.map((iv) => {
      const total = incomeEntries
        .filter((e) => {
          const d = new Date(e.date)
          return d >= iv.start && d <= iv.end
        })
        .reduce((s, e) => s + e.amount, 0)
      return { name: iv.label, ingresos: Math.round(total * 100) / 100 }
    }),
    [intervals, incomeEntries]
  )

  const hasData = chartData.some((d) => d.ingresos > 0)

  return (
    <div className="w-full h-[300px] relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 size={18} className="animate-spin text-text-muted" />
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e1e2c", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#e4e4e7" }}
            formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "Ingresos"]}
          />
          <Bar dataKey="ingresos" name="Ingresos" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.ingresos > 0 ? "#10b981" : "#10b98130"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {!loading && !hasData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xs text-text-muted">
              {error ? "Error al cargar ingresos" : "Sin ingresos registrados en el período"}
            </p>
            {error && <p className="text-xs text-zinc-700 mt-1">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
