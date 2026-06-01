import { z } from "zod"
import {
  FUNNEL_STAGES, STAGE_META, ACTION_VALUES, ORIGIN_VALUES, OPERATION_VALUES,
  type FunnelStage,
} from "./funnel"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (yyyy-MM-dd)")

// Base shape for creating an activity. Stage-specific required fields are
// enforced in `refine` below so the error points at the right field.
const baseActivity = z.object({
  stage: z.enum(FUNNEL_STAGES as [FunnelStage, ...FunnelStage[]]),
  activity_date: isoDate,
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
  action: z.enum(ACTION_VALUES as [string, ...string[]]).nullish(),
  origin: z.enum(ORIGIN_VALUES as [string, ...string[]]).nullish(),
  operation_type: z.enum(OPERATION_VALUES as [string, ...string[]]).nullish(),
  address_or_name: z.string().trim().max(300).nullish(),
  note: z.string().trim().max(2000).nullish(),
})

function applyStageRules(
  data: { stage: FunnelStage; action?: string | null; origin?: string | null; operation_type?: string | null },
  ctx: z.RefinementCtx,
) {
  const meta = STAGE_META[data.stage]
  if (meta.hasAction && !data.action) {
    ctx.addIssue({ code: "custom", path: ["action"], message: "La acción es obligatoria" })
  }
  if (meta.hasOrigin && !data.origin) {
    ctx.addIssue({ code: "custom", path: ["origin"], message: "El origen es obligatorio" })
  }
  if (meta.hasOperation && !data.operation_type) {
    ctx.addIssue({ code: "custom", path: ["operation_type"], message: "El tipo de operación es obligatorio" })
  }
}

export const createActivitySchema = baseActivity.superRefine(applyStageRules)

// PATCH allows a subset; stage cannot change. quantity stays optional.
export const updateActivitySchema = baseActivity
  .omit({ stage: true })
  .partial()
  .extend({ stage: z.enum(FUNNEL_STAGES as [FunnelStage, ...FunnelStage[]]) })
  .superRefine(applyStageRules)

/** Strips fields that don't apply to the stage so the DB row stays clean. */
export function normalizeForStage(stage: FunnelStage, input: {
  quantity?: number
  action?: string | null
  origin?: string | null
  operation_type?: string | null
  address_or_name?: string | null
  note?: string | null
}) {
  const meta = STAGE_META[stage]
  return {
    quantity: meta.hasQuantity ? (input.quantity ?? 1) : 1,
    action: meta.hasAction ? (input.action ?? null) : null,
    origin: meta.hasOrigin ? (input.origin ?? null) : null,
    operation_type: meta.hasOperation ? (input.operation_type ?? null) : null,
    address_or_name: input.address_or_name?.trim() || null,
    note: input.note?.trim() || null,
  }
}

/** First human-readable message from a ZodError. */
export function firstZodMessage(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Datos inválidos"
}
