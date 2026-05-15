import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns"
import { getPaymentStatus, daysUntilDue } from "./status"
import type { ServiciosState } from "@/lib/stores/serviciosStore"

export interface Insight {
  id: string
  text: string
  type: "info" | "warning" | "success"
}

export function computeInsights(state: ServiciosState): Insight[] {
  const { payments, providers, categories } = state
  const today = new Date()
  const insights: Insight[] = []

  // Vencimientos esta semana
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const thisWeek = payments.filter((p) =>
    !p.paidDate && isWithinInterval(new Date(p.dueDate), { start: weekStart, end: weekEnd })
  )
  if (thisWeek.length > 0) {
    insights.push({
      id: "week-due",
      text: `${thisWeek.length} vencimiento${thisWeek.length > 1 ? "s" : ""} esta semana`,
      type: "warning",
    })
  }

  // Mayor gasto del mes
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const thisMonthPaid = payments.filter(
    (p) => p.paidDate && isWithinInterval(new Date(p.paidDate), { start: monthStart, end: monthEnd })
  )
  if (thisMonthPaid.length > 0) {
    const byCat = new Map<string, number>()
    thisMonthPaid.forEach((p) => {
      byCat.set(p.categoryId, (byCat.get(p.categoryId) ?? 0) + (p.amountUSD || p.amount))
    })
    const topEntry = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0]
    const topCat = categories.find((c) => c.id === topEntry[0])
    if (topCat) {
      insights.push({
        id: "top-cat",
        text: `Mayor gasto del mes: ${topCat.name}`,
        type: "info",
      })
    }
  }

  // Gastos recurrentes vs mes anterior
  const prevMonthStart = startOfMonth(subMonths(today, 1))
  const prevMonthEnd = endOfMonth(subMonths(today, 1))
  const recProvIds = new Set(providers.filter((p) => p.recurrence && p.recurrence.freq !== "once").map((p) => p.id))
  const thisMonthRec = thisMonthPaid.filter((p) => p.providerId && recProvIds.has(p.providerId))
  const prevMonthRec = payments.filter(
    (p) => p.paidDate && p.providerId && recProvIds.has(p.providerId) &&
    isWithinInterval(new Date(p.paidDate), { start: prevMonthStart, end: prevMonthEnd })
  )
  const thisSum = thisMonthRec.reduce((s, p) => s + (p.amountUSD || 0), 0)
  const prevSum = prevMonthRec.reduce((s, p) => s + (p.amountUSD || 0), 0)
  if (prevSum > 0 && thisSum > 0) {
    const pct = Math.round(((thisSum - prevSum) / prevSum) * 100)
    if (pct > 5) {
      insights.push({
        id: "rec-increase",
        text: `Gastos recurrentes aumentaron ${pct}% vs mes anterior`,
        type: "warning",
      })
    } else if (pct < -5) {
      insights.push({
        id: "rec-decrease",
        text: `Gastos recurrentes bajaron ${Math.abs(pct)}% vs mes anterior`,
        type: "success",
      })
    }
  }

  // Próximo vencimiento
  const pending = payments
    .filter((p) => !p.paidDate && getPaymentStatus(p, today) === "pendiente")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  if (pending.length > 0) {
    const next = pending[0]
    const days = daysUntilDue(next, today)
    const prov = providers.find((p) => p.id === next.providerId)
    insights.push({
      id: "next-due",
      text: `Próximo vencimiento: ${prov?.name ?? "Sin proveedor"} en ${days} día${days !== 1 ? "s" : ""}`,
      type: "info",
    })
  }

  return insights.slice(0, 4)
}
