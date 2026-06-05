import { z } from 'zod'

/**
 * Validación + normalización de datos de contacto (client-safe, sin imports de node).
 * Usado en el alta manual (AddContactPanel) e import CSV. La ingesta automática
 * (inbound.ts) tiene su propia normalización server-side.
 */

/**
 * Normaliza un teléfono a formato E.164 argentino cuando es posible.
 * - Quita todo lo no numérico.
 * - Argentina (11 dígitos empezando en 54) → +54 9 ...
 * - 10/11 dígitos locales → asume AR móvil (+549...).
 * - Devuelve null si tiene menos de 8 dígitos (probablemente basura).
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (digits.length >= 11 && digits.startsWith('54')) {
    const rest = digits.slice(2)
    return rest.startsWith('9') ? `+54${rest}` : `+549${rest}`
  }
  if (digits.length === 10 || digits.length === 11) return `+549${digits}`
  return `+${digits}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(raw: string | null | undefined): boolean {
  if (!raw) return true // vacío = válido (campo opcional)
  return EMAIL_RE.test(raw.trim())
}

/**
 * Schema del alta de contacto. Valida en el borde antes de tocar la DB.
 * first_name obligatorio; email con formato si está presente; teléfono con
 * mínimo de dígitos. Devuelve mensajes en español para mostrar inline.
 */
export const contactInputSchema = z.object({
  first_name: z.string().trim().min(1, 'El nombre es obligatorio').max(120, 'Nombre demasiado largo'),
  last_name: z.string().trim().max(120, 'Apellido demasiado largo').nullable().optional(),
  primary_email: z
    .string()
    .trim()
    .max(160, 'Email demasiado largo')
    .refine(v => !v || EMAIL_RE.test(v), 'Email inválido')
    .nullable()
    .optional(),
  primary_phone: z
    .string()
    .trim()
    .refine(v => !v || v.replace(/\D/g, '').length >= 8, 'Teléfono inválido (muy corto)')
    .nullable()
    .optional(),
})

export type ContactInput = z.infer<typeof contactInputSchema>

/**
 * Valida los campos crudos del formulario y devuelve errores por campo (o null).
 * No normaliza: el caller decide cuándo normalizar el teléfono antes de guardar.
 */
export function validateContactInput(input: {
  first_name: string
  last_name?: string | null
  primary_email?: string | null
  primary_phone?: string | null
}): { ok: true } | { ok: false; errors: Record<string, string> } {
  const parsed = contactInputSchema.safeParse(input)
  if (parsed.success) return { ok: true }
  const errors: Record<string, string> = {}
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!errors[key]) errors[key] = issue.message
  }
  return { ok: false, errors }
}
