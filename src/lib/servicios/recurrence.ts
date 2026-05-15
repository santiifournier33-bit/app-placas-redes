import { addDays, addWeeks, addMonths, addYears, setDate } from "date-fns"
import type { Recurrence } from "@/lib/stores/serviciosStore"

export function nextDueDate(currentDue: string, rec: Recurrence): string | null {
  const date = new Date(currentDue)
  let next: Date

  switch (rec.freq) {
    case "once":         return null
    case "daily":        next = addDays(date, 1); break
    case "weekly":       next = addWeeks(date, 1); break
    case "biweekly":     next = addWeeks(date, 2); break
    case "monthly":
      next = addMonths(date, 1)
      if (rec.dayOfMonth) next = setDate(next, rec.dayOfMonth)
      break
    case "bimonthly":    next = addMonths(date, 2); break
    case "quarterly":    next = addMonths(date, 3); break
    case "semiannual":   next = addMonths(date, 6); break
    case "annual":       next = addYears(date, 1); break
    case "custom":
      next = addDays(date, rec.customDays ?? 30)
      break
    default:
      return null
  }

  if (rec.endDate && next > new Date(rec.endDate)) return null
  // Store as local noon to avoid UTC offset shifting the date (same convention as PaymentForm)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T12:00:00`
}

export const RECURRENCE_LABELS: Record<Recurrence["freq"], string> = {
  once:       "Una vez",
  daily:      "Diario",
  weekly:     "Semanal",
  biweekly:   "Cada 2 semanas",
  monthly:    "Mensual",
  bimonthly:  "Cada 2 meses",
  quarterly:  "Trimestral",
  semiannual: "Semestral",
  annual:     "Anual",
  custom:     "Personalizado",
}
