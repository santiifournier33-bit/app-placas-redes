# Runbook: Sync Zonaprop Locations Catalog

## Qué hace
Sincroniza catálogo de ubicaciones (barrios, countries, localidades, partidos) desde Zonaprop hacia la tabla `locations` en Supabase.

**Estrategia:**
1. BFS crawl desde URL seed (default: Pilar partido). Cubre N3 (partido) y N4 (localidades).
2. Best-effort N5 discovery via autocomplete + slug guess (muchas fallarán por slugs inconsistentes — es esperable).
3. Upsert via RPC `upsert_location_geojson` (convierte GeoJSON → geography).
4. Final: RPC `resolve_locations_parents` linkea `parent_id` por nombre.

## Cuándo ejecutar
- Setup inicial del catálogo de ubicaciones
- Expansión a una zona geográfica nueva (cambiando seed)
- Refresh anual (las ubicaciones cambian poco)

## ⚠️ Orden con otros scripts

**Si vas a correr también `backfill-inactive-inquiries.mjs`:**
- Primero: `sync-zonaprop-locations.mjs` (crea las `locations`)
- Después: `backfill-inactive-inquiries.mjs` (linkea inquiries a esas locations)

Si invertís el orden, el backfill matcheará menos o nada.

## Pre-requisitos
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- RPCs `upsert_location_geojson` y `resolve_locations_parents` ya existentes en Supabase
- Conexión a internet estable (hace crawl de Zonaprop)
- Browser headless: ya viene incluido via `playwright` (instalado en `node_modules`)

## Comandos

### Default (Pilar partido)

```bash
node scripts/sync-zonaprop-locations.mjs
```

### Custom seed + rate

```bash
node scripts/sync-zonaprop-locations.mjs --seed=/casas-venta-tigre-tigre.html --rate=1500 --max=200
```

### Flags

| Flag | Default | Significado |
|---|---|---|
| `--seed=<path>` | `/casas-venta-pilar-pilar.html` | URL relativa al origin de Zonaprop, define zona inicial |
| `--rate=<ms>` | `1500` | Delay entre requests (evitar rate limit) |
| `--max=<n>` | `200` | Límite máximo de ubicaciones a procesar |

## Output esperado

```
[xxx] Fetching seed: /casas-venta-pilar-pilar.html
[xxx] Found 24 interlinks (N4 candidates)
[xxx] Processing: pilar (N3)
[xxx]   → upserted: id=abc123
[xxx] Processing: del-viso (N4)
[xxx]   → upserted: id=def456
[xxx] Trying N5 discovery for "del-viso"...
[xxx]   slug attempt: "barrio-x-del-viso" → 404 (esperable)
...
[xxx] Resolving parents via RPC...
[xxx] Done. 87 locations upserted, 23 with geo, 64 sin geo (autocomplete).
```

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `Zonaprop returned 403/429` | Rate limit | Aumentar `--rate=3000`+ o cambiar UA |
| `RPC upsert_location_geojson does not exist` | RPC no creada en Supabase | Crear migration con la función (ver `docs/architecture.md`) |
| `extractPreloadedState returned null` | Zonaprop cambió estructura HTML | Investigar con scripts/reverse-eng/, actualizar parser |
| Muchas con `geo=null` | Autocomplete no devolvió coords | Esperable para slugs inconsistentes; no es bug |

## Dependencias

- Importa funciones de `scripts/reverse-eng/extract-zonaprop-geo.mjs` (parser de HTML)
- Si el HTML de Zonaprop cambia, actualizar `extract-zonaprop-geo.mjs` primero

## Verificación post-run

```sql
-- Count por nivel
SELECT level, count(*) FROM locations GROUP BY level ORDER BY level;
-- Sin geo
SELECT count(*) FROM locations WHERE geom IS NULL;
-- Sin parent
SELECT count(*) FROM locations WHERE parent_id IS NULL AND level > 1;
```
