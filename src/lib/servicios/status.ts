import { isSameDay, isBefore, startOfDay } from "date-fns"
import type { Payment, PaymentStatus } from "@/lib/stores/serviciosStore"

export function getPaymentStatus(p: Payment, today: Date = new Date()): PaymentStatus {
  if (p.paidDate) return "pagado"
  const due = startOfDay(new Date(p.dueDate))
  const t = startOfDay(today)
  if (isSameDay(due, t)) return "vence_hoy"
  if (isBefore(due, t)) return "vencido"
  return "pendiente"
}

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  pendiente:  "Pendiente",
  vence_hoy:  "Vence hoy",
  pagado:     "Pagado",
  vencido:    "Vencido",
}

export const STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string; dot: string; border: string }> = {
  pendiente:  { bg: "bg-blue-500/10",    text: "text-blue-400",    dot: "bg-blue-500",    border: "border-blue-500/20" },
  vence_hoy:  { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-500",   border: "border-amber-500/20" },
  pagado:     { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-500/20" },
  vencido:    { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-500",     border: "border-red-500/20" },
}

export function daysUntilDue(p: Payment, today: Date = new Date()): number {
  const due = startOfDay(new Date(p.dueDate))
  const t = startOfDay(today)
  return Math.round((due.getTime() - t.getTime()) / (1000 * 60 * 60 * 24))
}
