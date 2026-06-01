import { describe, it, expect } from "vitest"
import {
  FUNNEL_STAGES, STAGE_META, isFunnelStage, optionLabel, ORIGIN_OPTIONS,
  getPeriodRange, targetForPeriod, displayTarget, pct, WEEKS_PER_MONTH,
} from "@/lib/embudo/funnel"

describe("funnel stages", () => {
  it("has 6 ordered stages ending in venta", () => {
    expect(FUNNEL_STAGES).toHaveLength(6)
    expect(FUNNEL_STAGES[0]).toBe("conversacion")
    expect(FUNNEL_STAGES[5]).toBe("venta")
  })

  it("only conversacion uses quantity + action", () => {
    expect(STAGE_META.conversacion.hasQuantity).toBe(true)
    expect(STAGE_META.conversacion.hasAction).toBe(true)
    expect(STAGE_META.pretasacion.hasQuantity).toBe(false)
    expect(STAGE_META.tasacion.hasAction).toBe(false)
  })

  it("only reserva and venta use operation_type", () => {
    expect(STAGE_META.reserva.hasOperation).toBe(true)
    expect(STAGE_META.venta.hasOperation).toBe(true)
    expect(STAGE_META.captacion.hasOperation).toBe(false)
  })

  it("origin applies to all stages except conversacion", () => {
    expect(STAGE_META.conversacion.hasOrigin).toBe(false)
    for (const s of FUNNEL_STAGES.filter(s => s !== "conversacion")) {
      expect(STAGE_META[s].hasOrigin).toBe(true)
    }
  })

  it("isFunnelStage validates", () => {
    expect(isFunnelStage("venta")).toBe(true)
    expect(isFunnelStage("nope")).toBe(false)
    expect(isFunnelStage(null)).toBe(false)
  })

  it("optionLabel resolves DB value to UI label", () => {
    expect(optionLabel(ORIGIN_OPTIONS, "contacto_frio")).toBe("Contacto frío")
    expect(optionLabel(ORIGIN_OPTIONS, null)).toBeNull()
  })
})

describe("period math", () => {
  it("week range is Mon–Sun and spans 7 days", () => {
    // 2026-05-31 is a Sunday
    const r = getPeriodRange("week", new Date("2026-05-31T12:00:00"))
    expect(r.start).toBe("2026-05-25") // Monday
    expect(r.end).toBe("2026-05-31")   // Sunday
  })

  it("month range covers the whole month", () => {
    const r = getPeriodRange("month", new Date("2026-05-15T12:00:00"))
    expect(r.start).toBe("2026-05-01")
    expect(r.end).toBe("2026-05-31")
  })
})

describe("targets", () => {
  it("monthly target passes through in month period", () => {
    expect(targetForPeriod(100, "month")).toBe(100)
  })

  it("weekly target divides by weeks-per-month", () => {
    expect(targetForPeriod(100, "week")).toBeCloseTo(100 / WEEKS_PER_MONTH, 5)
  })

  it("displayTarget ceils fractional weekly goals", () => {
    expect(displayTarget(100, "week")).toBe(24) // 100/4.345 = 23.01 → 24
    expect(displayTarget(100, "month")).toBe(100)
  })

  it("sub-1 weekly targets become 'no weekly goal' (null)", () => {
    // ventas 0.5/month, reservas 1/month, captaciones 2/month → no weekly goal
    expect(displayTarget(0.5, "week")).toBeNull()
    expect(displayTarget(1, "week")).toBeNull()
    expect(displayTarget(2, "week")).toBeNull()
    // but they still show monthly
    expect(displayTarget(0.5, "month")).toBe(1) // 0.5 → ceil 1
    expect(displayTarget(2, "month")).toBe(2)
  })

  it("pct caps at 100 and handles zero target", () => {
    expect(pct(50, 100, "month")).toBe(50)
    expect(pct(200, 100, "month")).toBe(100)
    expect(pct(0, 100, "month")).toBe(0)
    expect(pct(1, 0, "month")).toBe(100)
    expect(pct(0, 0, "month")).toBe(0)
  })
})
