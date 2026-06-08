# Scripts Index — app-placas-redes

Tabla resumida de los 20 scripts en `scripts/`. Para scripts críticos hay runbook completo (link en columna "Runbook").

## Critical (runbook completo)

| Script | Qué hace | Cuándo | Side effects | Runbook |
|---|---|---|---|---|
| `tokko-panel-backfill.mjs` | Backfill webcontacts históricos Tokko → Supabase | One-shot, recovery, instalaciones nuevas | Upsert masivo en `inquiries` | [tokko-sync.md](tokko-sync.md) |
| `gmail-zonaprop-backfill.mjs` | Backfill IMAP → parse Zonaprop → update inquiries | One-shot, recovery histórico | UPDATE masivo en `inquiries` | [gmail-backfill.md](gmail-backfill.md) |
| `deploy-n8n-workflows.mjs` | Deploy workflows a n8n prod (real-time + backfill) | Setup inicial o re-deploy | Crea/actualiza workflows en n8n | [deploy-n8n-workflows.md](deploy-n8n-workflows.md) |
| `purge-test-data.mjs` | Borra contacts/inquiries de testing | Tras pruebas que ensucian DB | DELETE masivo (con dry-run) | [purge-test-data.md](purge-test-data.md) |
| `backfill-inactive-inquiries.mjs` | Backfill `location_id` en inquiries con properties inactivas | One-shot recovery | UPDATE masivo en `inquiries` | [backfill-inactive-inquiries.md](backfill-inactive-inquiries.md) |
| `sync-zonaprop-locations.mjs` | Crawl Zonaprop → upsert `locations` (barrios/countries) | Setup catálogo o expansión zona | Upsert masivo en `locations` | [sync-zonaprop-locations.md](sync-zonaprop-locations.md) |
| `tokko-panel-renew-session.mjs` | Login Playwright → guarda cookies frescas en `tokko_panel_session` | Cuando Edge Function reporta sesión expirada (~semanal) | UPDATE en `tokko_panel_session` | [tokko-panel-renew-session.md](tokko-panel-renew-session.md) |

## One-shots / Legacy (sin runbook propio)

| Script | Qué hace | Side effects |
|---|---|---|
| `dump-old-inquiries.mjs` | Dumpea inquiries antiguas a JSON local | Read-only |
| `infer-op-type-inactive.mjs` | Infiere `operation_type` para inquiries con property inactiva | UPDATE `inquiries.operation_type` |
| `fix-inquiries-operation-type.mjs` | Corrige `operation_type` mal seteado | UPDATE `inquiries.operation_type` |
| `verify-enrich.mjs` | Verifica que enrichment de leads funcionó | Read-only |

## n8n workflow scripts (operativa avanzada)

Todos modifican workflows en server n8n prod. Cuidado con orden de ejecución. Auth via `N8N_API_KEY` hardcoded en cada script (riesgo de seguridad).

| Script | Qué hace |
|---|---|
| `n8n-create-dump.mjs` | Crea workflow de dump completo |
| `n8n-fire-backfill.mjs` | Dispara workflow de backfill manualmente |
| `n8n-patch-fetch.mjs` | Patchea nodo fetch en workflow existente |
| `n8n-rewrite-supa.mjs` | Reescribe nodos Supabase de un workflow |
| `n8n-test-backfill.mjs` | Test del workflow de backfill |
| `n8n-update-parser.mjs` | Actualiza el parser de Zonaprop en workflow |
| `n8n-webhook-async.mjs` | Setea webhook async en workflow |
| `deploy-n8n-backfill.mjs` | Deploy del workflow de backfill (variante de `deploy-n8n-workflows.mjs`) |

## Reverse engineering (exploratory, no operativos)

Directorio `scripts/reverse-eng/`. No corren en producción — investigación de Zonaprop/Tokko HTML.

| Script | Qué hace |
|---|---|
| `capture.mjs` | Captura HTML genérico |
| `capture-zonaprop.mjs` | Captura listings de Zonaprop |
| `capture-zonaprop-v2.mjs` | Versión 2 del capture |
| `crawl-zonaprop-pilar.mjs` | Crawl recursivo de Pilar en Zonaprop |
| `extract-zonaprop-geo.mjs` | Extrae geolocaciones de Zonaprop HTML (usado por sync-zonaprop-locations) |
| `test-parser.mjs` | Test del parser de emails |

---

**Reglas generales para correr cualquier script:**

1. Verificar que `.env.local` tenga las env vars necesarias (cada script las lista en cabecera).
2. Si el script tiene `--dry-run` o `--apply`, usar dry-run primero. SIEMPRE.
3. Si muta data en producción: ejecutar fuera de horario de uso si es posible.
4. Revisar credenciales hardcodeadas antes de commitear cambios al script (varios tienen secrets en plaintext).

**Riesgos de seguridad conocidos en scripts:**

- `deploy-n8n-workflows.mjs:7,10` → N8N API key + Supabase service role key hardcoded
- `gmail-zonaprop-backfill.mjs` → ya fixed (usa `process.env.GMAIL_IMAP_PASS`)
- Varios `n8n-*.mjs` → API key hardcoded
