"use client"

import { useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  format, startOfYear, endOfYear, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachMonthOfInterval, eachWeekOfInterval,
  eachDayOfInterval, subYears, subMonths, subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import type { Period } from "./PeriodSelector"

interface GeneralChartProps {
  period: Period
}

function getIntervals(period: Period) {
  const today = new Date()
  switch (period) {
    case "year": {
      const years = Array.from({ length: 3 }, (_, i) => {
        const y = subYears(today, 2 - i)
        return { start: startOfYear(y), end: endOfYear(y), label: format(y, "yyyy") }
      })
      return years
    }
    case "month": {
      const start = subMonths(today, 11)
      return eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(today) }).map((d) => ({
        start: startOfMonth(d),
        end: endOfMonth(d),
        label: format(d, "MMM yy", { locale: es }),
      }))
    }
    case "week": {
      const start = subWeeks(today, 7)
      return eachWeekOfInterval(
        { start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) },
        { weekStartsOn: 1 }
      ).map((d) => ({
        start: startOfWeek(d, { weekStartsOn: 1 }),
        end: endOfWeek(d, { weekStartsOn: 1 }),
        label: `S${format(d, "w")}`,
      }))
    }
    case "day": {
      return eachDayOfInterval({
        start: subWeeks(today, 2),
        end: today,
      }).map((d) => ({
        start: d,
        end: d,
        label: format(d, "d/M"),
      }))
    }
  }
}

function isInInterval(dateStr: string, start: Date, end: Date) {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

export function GeneralChart({ period }: GeneralChartProps) {
  const { payments } = useServiciosStore()
  const intervals = useMemo(() => getIntervals(period), [period])

  const data = useMemo(() =>
    intervals.map((iv) => {
      const gastos = payments
        .filter((p) => p.paidDate && isInInterval(p.paidDate, iv.start, iv.end))
        .reduce((s, p) => s + (p.amountUSD || 0), 0)

      return {
        name: iv.label,
        gastos: Math.round(gastos * 100) / 100,
        ingresos: 0,
        beneficio: Math.max(0, 0 - gastos),
        perdida: Math.max(0, gastos - 0),
      }
    }), [intervals, payments])

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e1e2c", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#e4e4e7" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" name="Gastos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="beneficio" name="Beneficio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="perdida" name="Pérdida" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
