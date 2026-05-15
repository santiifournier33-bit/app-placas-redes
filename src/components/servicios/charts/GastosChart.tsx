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

interface GastosChartProps {
  period: Period
}

function getIntervals(period: Period) {
  const today = new Date()
  switch (period) {
    case "year": {
      return Array.from({ length: 3 }, (_, i) => {
        const y = subYears(today, 2 - i)
        return { start: startOfYear(y), end: endOfYear(y), label: format(y, "yyyy") }
      })
    }
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
    case "day": {
      return eachDayOfInterval({ start: subWeeks(today, 2), end: today }).map((d) => ({
        start: d, end: d, label: format(d, "d/M"),
      }))
    }
  }
}

export function GastosChart({ period }: GastosChartProps) {
  const { payments, categories } = useServiciosStore()

  const activeCats = useMemo(() => {
    const ids = new Set(payments.map((p) => p.categoryId))
    return categories.filter((c) => ids.has(c.id))
  }, [payments, categories])

  const intervals = useMemo(() => getIntervals(period), [period])

  const data = useMemo(() =>
    intervals.map((iv) => {
      const entry: Record<string, string | number> = { name: iv.label }
      activeCats.forEach((cat) => {
        const total = payments
          .filter((p) =>
            p.paidDate && p.categoryId === cat.id &&
            new Date(p.paidDate) >= iv.start && new Date(p.paidDate) <= iv.end
          )
          .reduce((s, p) => s + (p.amountUSD || 0), 0)
        entry[cat.name] = Math.round(total * 100) / 100
      })
      return entry
    }), [intervals, payments, activeCats])

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
          {activeCats.map((cat) => (
            <Bar key={cat.id} dataKey={cat.name} stackId="gastos" fill={cat.color} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
