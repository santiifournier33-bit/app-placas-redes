// Shared funnel domain: stages, wizard field rules, option lists, period math.
// Pure module — safe to import from both client components and API routes.
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, format,
} from "date-fns"

export type FunnelStage =
  | "conversacion" | "pretasacion" | "tasacion" | "captacion" | "reserva" | "venta"

// Ordered top → bottom of the funnel (most activity → final sale).
export const FUNNEL_STAGES: FunnelStage[] = [
  "conversacion", "pretasacion", "tasacion", "captacion", "reserva", "venta",
]

export interface StageMeta {
  id: FunnelStage
  label: string
  /** Short label for tight spaces (rings, table headers). */
  short: string
  /** Hex color for the progress ring + calendar dot. */
  color: string
  // Wizard field rules (mapped 1:1 to the reference app):
  hasQuantity: boolean   // conversacion logs N events at once
  hasAction: boolean     // conversacion: canal de contacto
  hasOrigin: boolean     // pretasacion/tasacion/captacion/reserva/venta
  hasOperation: boolean  // reserva/venta: 1 ó 2 puntas
}

export const STAGE_META: Record<FunnelStage, StageMeta> = {
  conversacion: { id: "conversacion", label: "Conversaciones", short: "Conv.",  color: "#38bdf8", hasQuantity: true,  hasAction: true,  hasOrigin: false, hasOperation: false },
  pretasacion:  { id: "pretasacion",  label: "Pretasaciones",  short: "Pretas.", color: "#818cf8", hasQuantity: false, hasAction: false, hasOrigin: true,  hasOperation: false },
  tasacion:     { id: "tasacion",     label: "Tasaciones",     short: "Tasac.",  color: "#a78bfa", hasQuantity: false, hasAction: false, hasOrigin: true,  hasOperation: false },
  captacion:    { id: "captacion",    label: "Captaciones",    short: "Capt.",   color: "#C8A45A", hasQuantity: false, hasAction: false, hasOrigin: true,  hasOperation: false },
  reserva:      { id: "reserva",      label: "Reservas",       short: "Reserv.", color: "#fb923c", hasQuantity: false, hasAction: false, hasOrigin: true,  hasOperation: true  },
  venta:        { id: "venta",        label: "Ventas",         short: "Ventas",  color: "#34d399", hasQuantity: false, hasAction: false, hasOrigin: true,  hasOperation: true  },
}

export function isFunnelStage(v: unknown): v is FunnelStage {
  return typeof v === "string" && (FUNNEL_STAGES as string[]).includes(v)
}

// ── Option lists (value = stored in DB, label = shown in UI) ──────────────
export interface Option { value: string; label: string }

export const ACTION_OPTIONS: Option[] = [
  { value: "llamado",   label: "Llamados" },
  { value: "cara_a_cara", label: "Cara a cara" },
  { value: "whatsapp",  label: "WhatsApp" },
  { value: "redes",     label: "Redes sociales" },
  { value: "pop_by",    label: "Pop by" },
  { value: "eventos",   label: "Eventos" },
  { value: "otros",     label: "Otros" },
]
export const ACTION_VALUES = ACTION_OPTIONS.map(o => o.value)

export const ORIGIN_OPTIONS: Option[] = [
  { value: "conocido",        label: "Conocido" },
  { value: "referido",        label: "Referido" },
  { value: "repetido",        label: "Repetido" },
  { value: "visita",          label: "Visita" },
  { value: "redes",           label: "Redes sociales" },
  { value: "referido_colega", label: "Referido de colega" },
  { value: "contacto_frio",   label: "Contacto frío" },
  { value: "otros",           label: "Otros" },
]
export const ORIGIN_VALUES = ORIGIN_OPTIONS.map(o => o.value)

export const OPERATION_OPTIONS: Option[] = [
  { value: "una_punta",  label: "1 punta" },
  { value: "dos_puntas", label: "2 puntas" },
]
export const OPERATION_VALUES = OPERATION_OPTIONS.map(o => o.value)

export function optionLabel(list: Option[], value: string | null | undefined): string | null {
  if (!value) return null
  return list.find(o => o.value === value)?.label ?? value
}

// ── Period math ───────────────────────────────────────────────────────────
export type Period = "week" | "month"

/** Average weeks per month — used to derive weekly targets from monthly goals. */
export const WEEKS_PER_MONTH = 4.345

export interface DateRange { start: string; end: string } // inclusive ISO dates (yyyy-MM-dd)

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

/** Inclusive ISO date range for the period containing `ref`. Weeks start Monday. */
export function getPeriodRange(period: Period, ref: Date = new Date()): DateRange {
  if (period === "week") {
    return {
      start: toISODate(startOfWeek(ref, { weekStartsOn: 1 })),
      end: toISODate(endOfWeek(ref, { weekStartsOn: 1 })),
    }
  }
  return {
    start: toISODate(startOfMonth(ref)),
    end: toISODate(endOfMonth(ref)),
  }
}

/** Raw numeric target for the period (week target = monthly / weeks-per-month). */
export function targetForPeriod(monthlyTarget: number, period: Period): number {
  return period === "week" ? monthlyTarget / WEEKS_PER_MONTH : monthlyTarget
}

/**
 * Integer shown as the ring/row denominator. Sub-1 weekly targets (low-frequency
 * stages like ventas) become "no weekly goal" → returns null in week view.
 *
 * @deprecated Prefer `periodGoal` — it never hides low-frequency stages, it
 * expresses them as a natural cadence instead. Kept for callers not yet migrated.
 */
export function displayTarget(monthlyTarget: number, period: Period): number | null {
  const raw = targetForPeriod(monthlyTarget, period)
  if (period === "week" && raw < 0.5) return null // sin meta semanal
  if (raw <= 0) return null
  return Number.isInteger(raw) ? raw : Math.ceil(raw)
}

/**
 * Adaptive period goal. Low-frequency stages (captación/reserva/venta) whose
 * weekly target is below 1 no longer show "sin meta": the denominator becomes 1
 * (the next single unit to achieve) and `cadence` describes the real rhythm
 * ("1 cada 2 sem", "1 por mes", "1 cada 2 meses"). Logging one activity fills
 * the ring to 100%. `denom: null` only when no monthly goal is configured.
 */
export interface PeriodGoal { denom: number | null; cadence: string | null }

function weeklyCadenceLabel(monthly: number): string {
  const monthsPerUnit = 1 / monthly
  if (monthsPerUnit <= 0.75) {
    const weeks = Math.max(2, Math.round(WEEKS_PER_MONTH / monthly))
    return `1 cada ${weeks} sem`
  }
  if (monthsPerUnit <= 1.5) return "1 por mes"
  return `1 cada ${Math.round(monthsPerUnit)} meses`
}

function monthlyCadenceLabel(monthly: number): string {
  const months = Math.round(1 / monthly)
  return months <= 1 ? "1 por mes" : `1 cada ${months} meses`
}

export function periodGoal(monthlyTarget: number, period: Period): PeriodGoal {
  if (monthlyTarget <= 0) return { denom: null, cadence: null }
  if (period === "month") {
    const denom = Number.isInteger(monthlyTarget) ? monthlyTarget : Math.ceil(monthlyTarget)
    return { denom, cadence: monthlyTarget < 1 ? monthlyCadenceLabel(monthlyTarget) : null }
  }
  const weeklyRaw = monthlyTarget / WEEKS_PER_MONTH
  if (weeklyRaw >= 1) {
    return { denom: Number.isInteger(weeklyRaw) ? weeklyRaw : Math.ceil(weeklyRaw), cadence: null }
  }
  // Low-frequency: aim for the next single unit, label the real cadence.
  return { denom: 1, cadence: weeklyCadenceLabel(monthlyTarget) }
}

// ── Daily distribution (for the "Tu día" widget) ────────────────────────────

/** Work week is Mon–Fri; Sat/Sun are rest days (no daily quota). */
export const WORKDAYS_PER_WEEK = 5

/** Integer weekly target derived from the monthly goal. */
export function weeklyTargetInt(monthlyTarget: number): number {
  return Math.round(targetForPeriod(monthlyTarget, "week"))
}

/** Workday index for a date: 0=Mon … 4=Fri, or null on Sat/Sun. */
export function workdayIndex(d: Date): number | null {
  const g = d.getDay() // 0=Sun … 6=Sat
  if (g === 0 || g === 6) return null
  return g - 1
}

/**
 * Daily target for a given workday so the five days sum EXACTLY to the weekly
 * target — no rounding overshoot. The remainder is front-loaded (early days get
 * the extra unit). E.g. weekly 24 → [5,5,5,5,4]; weekly 28 → [6,6,6,5,5];
 * weekly 3 → [1,1,1,0,0]. `dayIdx` is 0=Mon … 4=Fri.
 */
export function dailyTargetForDay(weeklyTarget: number, dayIdx: number): number {
  if (weeklyTarget <= 0 || dayIdx < 0 || dayIdx >= WORKDAYS_PER_WEEK) return 0
  const per = Math.floor(weeklyTarget / WORKDAYS_PER_WEEK)
  const rem = weeklyTarget % WORKDAYS_PER_WEEK
  return per + (dayIdx < rem ? 1 : 0)
}

/** Completion percentage (0–100), capped. target<=0 → 100 if any actual else 0. */
export function pct(actual: number, monthlyTarget: number, period: Period): number {
  const raw = targetForPeriod(monthlyTarget, period)
  if (raw <= 0) return actual > 0 ? 100 : 0
  return Math.min(100, Math.round((actual / raw) * 100))
}

/** Sum `quantity` per stage across activities (quantity defaults to 1). */
export function sumByStage<T extends { stage: string; quantity?: number | null }>(
  items: T[],
): Record<FunnelStage, number> {
  const totals = FUNNEL_STAGES.reduce((acc, s) => { acc[s] = 0; return acc }, {} as Record<FunnelStage, number>)
  for (const it of items) {
    if (isFunnelStage(it.stage)) totals[it.stage] += Number(it.quantity ?? 1) || 0
  }
  return totals
}
