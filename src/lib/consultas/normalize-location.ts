// Normalize + parse Tokko-style location_full hierarchies.
//
// Tokko emits the location string in **inconsistent formats** depending on the source:
//   • Tokko public API /api/v1/property/{id}/: "Argentina | G.B.A. Zona Norte | Pilar | Pilar | Los Mirasoles"
//     (5 segments, most-general first)
//   • Tokko panel /api3/property/{id}/quick: "Pilar | Pilar | G.B.A. Zona Norte"
//     (3 segments, most-specific first — REVERSED order)
//   • Some properties stop at localidad (no barrio cataloged): "Argentina | G.B.A. Zona Norte | Pilar | Pilar"
//   • Some have addresses where partido name repeats as localidad ("Pilar | Pilar")
//
// Comparing two location strings by raw index produces FALSE BARRIO MATCHES when:
//   • partido and localidad share the same name (most of Pilar partido).
//   • Two inquiries/props are in the same localidad but different barrios.
//
// This module exposes:
//   1. parseLocationHierarchy(s) → Map<Level, string> — robust parsing across formats.
//   2. normalizeLocationFull(raw, sourceFormat) → canonical string for DB storage.
//
// Used by:
//   • src/lib/consultas/matching.ts — hierarchyMatch reads parsed levels (not indices).
//   • src/lib/inquiries/inbound.ts — normalizes Tokko public API response before snapshot.
//   • src/lib/tokko-panel/api3-client.ts — normalizes api3 response before snapshot.

export type LocationLevel = 'pais' | 'region' | 'partido' | 'localidad' | 'barrio'

/** Tokens that signal a segment refers to a region/zone (not a barrio) — used to detect reverse-order api3 format. */
const REGION_TOKENS = /\b(gba|zona|norte|sur|oeste|capital|federal|provincia|interior|patagonia|cuyo|noa|nea|pampa)\b/i

function tokensInclude(s: string): boolean {
  return REGION_TOKENS.test(s.toLowerCase())
}

function splitSegments(raw: string): string[] {
  return raw.split('|').map(s => s.trim()).filter(Boolean)
}

/**
 * Parse a Tokko-style location_full string into a Map of named levels.
 *
 * Heuristic by segment count:
 *   5 segs → pais | region | partido | localidad | barrio                      (Tokko public API standard)
 *   4 segs → pais | partido | localidad | barrio                                (Tokko public sin region)
 *   3 segs → if last segment looks like a region (REGION_TOKENS):
 *              → localidad | partido | region   (reverse, api3 format)
 *            else:
 *              → region | partido | localidad
 *   2 segs → partido | localidad
 *   1 seg  → localidad (just the name)
 *
 * Post-parse dedup:
 *   • if localidad === partido, drop localidad (e.g. "Pilar | Pilar").
 *   • if barrio === localidad, drop barrio (no real subzone).
 */
export function parseLocationHierarchy(raw: string | null | undefined): Map<LocationLevel, string> {
  const out = new Map<LocationLevel, string>()
  if (!raw) return out

  const segs = splitSegments(raw)
  if (segs.length === 0) return out

  if (segs.length === 5) {
    out.set('pais', segs[0])
    out.set('region', segs[1])
    out.set('partido', segs[2])
    out.set('localidad', segs[3])
    out.set('barrio', segs[4])
  } else if (segs.length === 4) {
    out.set('pais', segs[0])
    out.set('partido', segs[1])
    out.set('localidad', segs[2])
    out.set('barrio', segs[3])
  } else if (segs.length === 3) {
    if (tokensInclude(segs[2])) {
      // api3 reverse: localidad | partido | region
      out.set('localidad', segs[0])
      out.set('partido', segs[1])
      out.set('region', segs[2])
    } else {
      // Tokko public sin pais: region | partido | localidad
      out.set('region', segs[0])
      out.set('partido', segs[1])
      out.set('localidad', segs[2])
    }
  } else if (segs.length === 2) {
    out.set('partido', segs[0])
    out.set('localidad', segs[1])
  } else if (segs.length === 1) {
    out.set('localidad', segs[0])
  }

  // Dedup: collapse repeated names so they don't fake a deeper level.
  const cmpKey = (s: string) => s.toLowerCase().trim()
  const partido = out.get('partido')
  const localidad = out.get('localidad')
  const barrio = out.get('barrio')
  if (partido && localidad && cmpKey(partido) === cmpKey(localidad)) {
    out.delete('localidad')
  }
  if (localidad && barrio && cmpKey(localidad) === cmpKey(barrio)) {
    out.delete('barrio')
  }
  // Also dedup partido vs barrio if no localidad in between.
  if (!out.has('localidad') && partido && barrio && cmpKey(partido) === cmpKey(barrio)) {
    out.delete('barrio')
  }

  return out
}

/**
 * Normalize a raw Tokko location_full string to a canonical form for DB storage.
 * Canonical = `pais | region | partido | localidad | barrio` (with missing levels omitted).
 * Same hierarchy always produces same output regardless of source.
 *
 * @param raw original location_full from Tokko
 * @param sourceFormat 'public' (api/v1) or 'api3' (panel)
 */
export function normalizeLocationFull(
  raw: string | null | undefined,
  sourceFormat: 'public' | 'api3' = 'public',
): string | null {
  if (!raw) return null
  // For api3 (already reverse-order), the parser handles it. We still parse and emit canonical.
  void sourceFormat // kept for future extensibility; parser already heuristically detects reverse
  const parsed = parseLocationHierarchy(raw)
  if (parsed.size === 0) return null
  const order: LocationLevel[] = ['pais', 'region', 'partido', 'localidad', 'barrio']
  const out: string[] = []
  for (const lvl of order) {
    const v = parsed.get(lvl)
    if (v) out.push(v)
  }
  if (out.length === 0) return null
  return out.join(' | ')
}
