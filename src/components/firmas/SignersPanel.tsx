'use client'

import { isValidEmail } from '@/lib/firmas/autorizacion'

export interface ConyugeForm {
  nombre: string
  caracter: string
  email: string
}

export interface PropietarioForm {
  nombre: string
  dni: string
  domicilio: string
  localidad: string
  partido: string
  estadoCivil: string
  telefono: string
  email: string
  conyuge: ConyugeForm | null
}

export function emptyPropietario(): PropietarioForm {
  return {
    nombre: '', dni: '', domicilio: '', localidad: '', partido: 'Buenos Aires',
    estadoCivil: 'Soltero/a', telefono: '', email: '', conyuge: null,
  }
}

const COMMON_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com']
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gamil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'yahooo.com': 'yahoo.com',
}

/** Sugiere una corrección de typo de dominio, o null. */
export function suggestEmailTypo(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1).toLowerCase()
  if (!domain) return null
  if (DOMAIN_TYPOS[domain]) return `${local}@${DOMAIN_TYPOS[domain]}`
  if (domain.endsWith('.con')) return `${local}@${domain.slice(0, -4)}.com`
  if (COMMON_DOMAINS.includes(domain)) return null
  return null
}

const inputCls =
  'w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors'

function EmailField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const touched = value.length > 0
  const invalid = touched && !isValidEmail(value)
  const suggestion = touched ? suggestEmailTypo(value) : null
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label} *</label>
      <input
        type="email"
        inputMode="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} ${invalid ? 'border-red-500/60' : ''}`}
      />
      {invalid && <p className="mt-1 text-xs text-red-400">Email inválido</p>}
      {suggestion && (
        <button
          type="button"
          onClick={() => onChange(suggestion)}
          className="mt-1 text-xs text-amber-400 hover:underline"
        >
          ¿Quisiste decir {suggestion}?
        </button>
      )}
    </div>
  )
}

export default function SignersPanel({
  value,
  onChange,
}: {
  value: PropietarioForm[]
  onChange: (next: PropietarioForm[]) => void
}) {
  const update = (i: number, patch: Partial<PropietarioForm>) => {
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  const updateConyuge = (i: number, patch: Partial<ConyugeForm>) => {
    onChange(
      value.map((p, idx) =>
        idx === i ? { ...p, conyuge: { ...(p.conyuge ?? { nombre: '', caracter: 'Cónyuge', email: '' }), ...patch } } : p,
      ),
    )
  }
  const toggleConyuge = (i: number, on: boolean) => {
    update(i, { conyuge: on ? { nombre: '', caracter: 'Cónyuge', email: '' } : null })
  }
  const addPropietario = () => onChange([...value, emptyPropietario()])
  const removePropietario = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-[var(--text-primary)]">Propietarios firmantes</h4>
        <span className="text-xs text-[var(--text-muted)]">{value.length} {value.length === 1 ? 'propietario' : 'propietarios'}</span>
      </div>

      {value.map((p, i) => (
        <div key={i} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">Propietario {i + 1}</span>
            {value.length > 1 && (
              <button
                type="button"
                onClick={() => removePropietario(i)}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                ✕ Quitar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nombre completo *</label>
              <input type="text" value={p.nombre} onChange={(e) => update(i, { nombre: e.target.value })} className={inputCls} />
            </div>
            <EmailField label="Email" value={p.email} onChange={(v) => update(i, { email: v })} />
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">DNI *</label>
              <input type="text" value={p.dni} onChange={(e) => update(i, { dni: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Teléfono</label>
              <input type="text" value={p.telefono} onChange={(e) => update(i, { telefono: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Estado civil</label>
              <input type="text" value={p.estadoCivil} onChange={(e) => update(i, { estadoCivil: e.target.value })} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Domicilio *</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Calle y número" value={p.domicilio} onChange={(e) => update(i, { domicilio: e.target.value })} className={inputCls} />
                <input type="text" placeholder="Localidad" value={p.localidad} onChange={(e) => update(i, { localidad: e.target.value })} className={inputCls} />
                <input type="text" placeholder="Partido / Provincia" value={p.partido} onChange={(e) => update(i, { partido: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Cónyuge / conviviente firmante */}
          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={p.conyuge !== null}
                onChange={(e) => toggleConyuge(i, e.target.checked)}
                className="rounded accent-violet-500"
              />
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Tiene cónyuge / conviviente que firma el asentimiento
              </span>
            </label>

            {p.conyuge && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nombre completo *</label>
                  <input type="text" value={p.conyuge.nombre} onChange={(e) => updateConyuge(i, { nombre: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Carácter</label>
                  <select value={p.conyuge.caracter} onChange={(e) => updateConyuge(i, { caracter: e.target.value })} className={inputCls}>
                    <option value="Cónyuge">Cónyuge</option>
                    <option value="Conviviente">Conviviente</option>
                  </select>
                </div>
                <EmailField label="Email" value={p.conyuge.email} onChange={(v) => updateConyuge(i, { email: v })} />
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addPropietario}
        className="w-full py-2.5 text-sm font-medium bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 rounded-lg border border-dashed border-violet-500/30 transition-colors"
      >
        + Agregar propietario
      </button>
    </div>
  )
}
