import { describe, it, expect } from "vitest"
import {
  computeMatchScore,
  computeMatchScoreSmart,
  operationsMatch,
  type PropertyAttributes,
  type UserPreferences,
} from "@/lib/consultas/matching"

// Target de referencia: Casa, Venta, USD 199.000, 4 dorm, Los Mirasoles (Pilar).
function target(overrides: Partial<PropertyAttributes> = {}): PropertyAttributes {
  return {
    tokko_id: 4933116,
    operation_type: 1,
    price: 199000,
    currency: "USD",
    property_type: "Casa",
    bedrooms: 4,
    geo_lat: null,
    geo_long: null,
    location_name: "Los Mirasoles",
    location_full: "Argentina | G.B.A. Zona Norte | Pilar | Countries/B.Cerrado (Pilar) | Los Mirasoles",
    location_id: 45,
    location_is_approximate: false,
    ...overrides,
  }
}

function inquiry(overrides: Partial<PropertyAttributes> = {}): PropertyAttributes {
  return { ...target({ tokko_id: 999999 }), ...overrides }
}

describe("gate geográfico (zone.kind === 'none')", () => {
  it("descarta (total 0) un match sin solape geográfico aunque precio/dorm/tipo sean perfectos", () => {
    // Inquiry de OTRO partido (Escobar), sin geo ni location_id compartido,
    // pero misma Casa / mismo precio / mismos dormitorios → zona = none.
    const inq = inquiry({
      location_id: null,
      location_full: "Argentina | G.B.A. Zona Norte | Escobar | Countries/B.Cerrado (Escobar) | El Cantón",
    })
    const prop = target({ location_id: null })
    const score = computeMatchScore(prop, inq)
    expect(score.zone_kind).toBe("none")
    expect(score.breakdown.zone).toBe(0)
    // Antes del gate este caso daba 60 (price 30 + beds 20 + type 10) y pasaba el threshold 40.
    expect(score.total).toBe(0)
    expect(score.reasons).toContain("sin cercanía geográfica")
  })

  it("conserva un match en el MISMO polígono (zona precisa) con score alto", () => {
    const prop = target()
    const inq = inquiry() // mismo location_id 45, no aproximado
    const score = computeMatchScore(prop, inq)
    expect(score.zone_kind).toBe("polygon_same")
    expect(score.breakdown.zone).toBe(100)
    expect(score.total).toBe(100)
  })
})

describe("preferencias ZonaProp = solo referencia (no afectan score)", () => {
  it("computeMatchScoreSmart ignora user_preferences: mismo score con o sin prefs", () => {
    const prop = target()
    const inq = inquiry()
    const prefs: UserPreferences = {
      operation_type: 2, // alquiler — opuesto al snapshot; NO debe influir
      property_type: "Departamento",
      price_min: 1,
      price_max: 10,
      zones: ["Nordelta"],
    }
    const sinPrefs = computeMatchScoreSmart(prop, inq, null)
    const conPrefs = computeMatchScoreSmart(prop, inq, prefs)
    expect(conPrefs.total).toBe(sinPrefs.total)
    expect(conPrefs.source).toBe("snapshot")
  })
})

describe("operationsMatch (gate de operación)", () => {
  it("venta solo matchea venta; alquiler matchea 2 o 3", () => {
    expect(operationsMatch(1, 1)).toBe(true)
    expect(operationsMatch(1, 2)).toBe(false)
    expect(operationsMatch(2, 3)).toBe(true)
    expect(operationsMatch(2, 1)).toBe(false)
    expect(operationsMatch(null, 1)).toBe(false)
  })
})
