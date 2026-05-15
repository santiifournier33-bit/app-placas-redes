import { isWithinInterval, startOfWeek, endOfWeek } from 'date-fns'

export interface TrackerTargets {
  contactos: number
  items_valor: number
  cafes: number
  valor_masivo: number
}

export const DEFAULT_TARGETS: TrackerTargets = {
  contactos: 40,
  items_valor: 5,
  cafes: 5,
  valor_masivo: 1,
}

export interface TrackerMetric {
  current: number
  target: number
  label: string
  color: string
}

interface CompletedTask {
  task_type: string
  completed: boolean | null
  completed_at: string | null
}

const CONTACTO_TYPES = ['llamada', 'tarea']
const ITEM_VALOR_TYPE = 'item_valor'
const CAFE_TYPE = 'cafe'
const VALOR_MASIVO_TYPE = 'item_valor_masivo'

export function getWeeklyTrackerMetrics(
  tasks: CompletedTask[],
  weekDate: Date,
  targets: TrackerTargets = DEFAULT_TARGETS
): TrackerMetric[] {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })

  const inWeek = (completedAt: string | null) => {
    if (!completedAt) return false
    return isWithinInterval(new Date(completedAt), { start: weekStart, end: weekEnd })
  }

  const completedInWeek = tasks.filter(t => t.completed && inWeek(t.completed_at))

  return [
    {
      label: 'Contactos',
      current: completedInWeek.filter(t => CONTACTO_TYPES.includes(t.task_type)).length,
      target: targets.contactos,
      color: '#3b82f6',
    },
    {
      label: 'Items de valor',
      current: completedInWeek.filter(t => t.task_type === ITEM_VALOR_TYPE).length,
      target: targets.items_valor,
      color: '#8b5cf6',
    },
    {
      label: 'Cafés',
      current: completedInWeek.filter(t => t.task_type === CAFE_TYPE).length,
      target: targets.cafes,
      color: '#f59e0b',
    },
    {
      label: 'Valor masivo',
      current: completedInWeek.filter(t => t.task_type === VALOR_MASIVO_TYPE).length,
      target: targets.valor_masivo,
      color: '#10b981',
    },
  ]
}
