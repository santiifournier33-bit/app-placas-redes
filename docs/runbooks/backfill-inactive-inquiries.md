# Runbook: Backfill Inactive Inquiries Location

## Qué hace
Backfill `location_id` en inquiries que tienen `property_snapshot._source = 'inactive'` (data perdida porque la propiedad estaba borrada al momento del ingest).

**Estrategia:** usa el endpoint privado del panel Tokko `/api3/property/{id}/quick` (que sí devuelve geo para inactivas), con auth via cookies + JWT Bearer almacenados en `public.tokko_panel_session`.

## Cuándo ejecutar
- One-shot recovery: cuando hay inquiries con `location_id = null` que deberían tener uno
- Tras incidente que dejó inquiries sin geo
- Solo si la sesión de `tokko_panel_session` está fresca (sino correr `tokko-panel-renew-session.mjs` primero)

## Pre-requisitos
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Tabla `tokko_panel_session` con cookies + JWT vigentes
- Si la sesión expiró: correr primero `node scripts/tokko-panel-renew-session.mjs` ([runbook](tokko-panel-renew-session.md))

## Comandos

### Dry-run (recomendado primero)

```bash
node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs --dry-run
```

Muestra qué inquiries serían actualizadas, sin escribir nada.

### Apply completo

```bash
node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs
```

### Apply limitado (para probar en lote pequeño)

```bash
node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs --limit=10
```

### Ajustar rate limiting (para evitar bloqueos del panel Tokko)

```bash
node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs --rate=3000 --jitter=1000
```

Default: `--rate=2000 --jitter=500` (2s entre requests + jitter random hasta 500ms).

## Output esperado

```
[xxx] Querying inquiries with _source='inactive' and location_id IS NULL...
[xxx] Found 342 inquiries to backfill
[xxx] Processing inquiry abc123 (property_id=789)...
[xxx] Updated: location_id=xxx
[xxx] Sleeping 2347ms...
...
[xxx] Done. 342 processed, 287 updated, 55 failed (panel returned no geo)
```

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `Missing SUPABASE_URL` | env vars no cargadas | Usar `--env-file=.env.local` |
| `tokko_panel_session not found` o `401 from Tokko` | Sesión expirada | Correr `tokko-panel-renew-session.mjs` primero |
| `Rate limited by Tokko (429)` | Demasiado rápido | Aumentar `--rate=5000` |
| Muchos "no geo returned" | Propiedades demasiado antiguas, ya no existen en panel | Esperable. Quedan con `location_id=null`. |

## Verificación post-run

```sql
-- En Supabase SQL editor:
SELECT count(*) FROM inquiries
WHERE property_snapshot->>'_source' = 'inactive'
  AND location_id IS NULL;
```

Debería haber bajado significativamente desde el count inicial.
