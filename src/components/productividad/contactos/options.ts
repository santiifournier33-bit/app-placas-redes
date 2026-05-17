import type { ChipColor } from './InlineSelectChip'

export interface ChipOption {
  value: string
  label: string
  color?: ChipColor
}

export const SOURCE_OPTIONS: ChipOption[] = [
  { value: 'referido', label: 'Referido', color: 'violet' },
  { value: 'portal',   label: 'Portal',   color: 'blue' },
  { value: 'redes',    label: 'Redes',    color: 'cyan' },
  { value: 'oficina',  label: 'Oficina',  color: 'amber' },
  { value: 'otro',     label: 'Otro',     color: 'zinc' },
]

export const CIRCLE_OPTIONS: ChipOption[] = [
  { value: 'principal',   label: 'Principal',   color: 'red' },
  { value: 'fundamental', label: 'Fundamental', color: 'amber' },
  { value: 'vital',       label: 'Vital',       color: 'emerald' },
]

export const CATEGORY_OPTIONS: ChipOption[] = [
  { value: 'A', label: 'A — Refiere solo',     color: 'emerald' },
  { value: 'B', label: 'B — Refiere si pedís', color: 'blue' },
  { value: 'C', label: 'C — Buena relación',   color: 'amber' },
  { value: 'D', label: 'D — Sin relación',     color: 'red' },
]

export const TIPO_OPTIONS: ChipOption[] = [
  { value: 'profesional', label: 'Profesional', color: 'violet' },
  { value: 'personal',    label: 'Personal',    color: 'blue' },
  { value: 'ambos',       label: 'Ambos',       color: 'cyan' },
]

export const CERCANIA_OPTIONS: ChipOption[] = [
  { value: '1', label: '1 — Alta',  color: 'emerald' },
  { value: '2', label: '2 — Media', color: 'amber' },
  { value: '3', label: '3 — Baja',  color: 'red' },
]

// Shorter labels (for table cells); same colors
export const CATEGORY_SHORT: ChipOption[] = [
  { value: 'A', label: 'A', color: 'emerald' },
  { value: 'B', label: 'B', color: 'blue' },
  { value: 'C', label: 'C', color: 'amber' },
  { value: 'D', label: 'D', color: 'red' },
]
