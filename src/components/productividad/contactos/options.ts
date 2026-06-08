import type { ChipColor } from './InlineSelectChip'

export interface ChipOption {
  value: string
  label: string
  color?: ChipColor
}

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

// Descripción de cada campo (lenguaje simple). Fuente única reutilizada por el
// alta (texto bajo el campo), la ficha de detalle (ícono Info) y los encabezados
// de la tabla (tooltip nativo). Basado en las definiciones del método del usuario.
export const FIELD_HINTS: Record<string, string> = {
  last_contact_date: 'Cuándo hablaste por última vez con la persona.',
  first_name: 'Nombre del contacto.',
  last_name: 'Apellido del contacto.',
  primary_phone: 'Teléfono de contacto (con código de país).',
  primary_email: 'Email de contacto.',
  rol: 'Su posición en tu vida (ej: hermano, excompañero, colega).',
  tipo: 'Si la relación es profesional, personal o ambas.',
  cercania: 'Del 1 al 3, según qué tan cómodo te sentís invitándolo a tomar un café.',
  contexto: 'Ámbito o grupo donde conociste a la persona (ej: nombre del colegio, trabajo).',
  ubicacion: 'Dónde vive, sin importar tu zona de nicho.',
  circulo: 'Método 5-50-100: Principal (contacto diario), Fundamental (semanal), Vital (mensual).',
  category: 'Qué tan dispuesto está a referirte clientes (A a D).',
  pipeline_stage: 'Etapa del contacto dentro de tu proceso comercial.',
  es_estrategico: 'Vinculado o con acceso a tu nicho (ej: un inversor que conoce a otros inversores).',
  es_influyente: 'Si te refiere, traería muchos clientes por su peso en su círculo.',
  es_mentor: 'Alguien de quien aprendés.',
}
