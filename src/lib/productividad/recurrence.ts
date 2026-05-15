import { addDays, addWeeks, addMonths, setDate, lastDayOfMonth, min } from 'date-fns'

export type RecurrenceFreq = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'

export interface RecurrenceConfig {
  freq: RecurrenceFreq
  interval?: number
  dayOfWeek?: number
  dayOfMonth?: number
  endDate?: string
}

export function generateNextDueDate(
  currentDueDate: string,
  config: RecurrenceConfig
): string | null {
  const current = new Date(currentDueDate)
  const { freq, interval, dayOfMonth, endDate } = config

  let next: Date

  switch (freq) {
    case 'daily':
      next = addDays(current, interval ?? 1)
      break
    case 'weekly':
      next = addWeeks(current, 1)
      break
    case 'biweekly':
      next = addWeeks(current, 2)
      break
    case 'monthly': {
      const raw = addMonths(current, 1)
      if (dayOfMonth) {
        const maxDay = lastDayOfMonth(raw).getDate()
        next = setDate(raw, Math.min(dayOfMonth, maxDay))
      } else {
        next = raw
      }
      break
    }
    case 'custom':
      next = addDays(current, interval ?? 1)
      break
    default:
      return null
  }

  if (endDate && next > new Date(endDate)) return null

  return next.toISOString().slice(0, 10)
}
