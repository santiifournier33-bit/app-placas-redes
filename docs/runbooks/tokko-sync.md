# Runbook: Tokko Panel Backfill

## Qué hace
Sincroniza webcontacts históricos desde el panel de Tokko Broker hacia Supabase. Pagina por buckets (new/assigned/deleted) y hace upsert via service role.

## Cuándo ejecutar
- Cuando se detectan consultas faltantes en la app vs. lo que hay en Tokko panel
- Después de agregar un agente nuevo
- Para recuperar historial en instalaciones nuevas

## Pre-requisitos
- `.env.local` presente en la raíz del proyecto con `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TOKKO_API_KEY`
- Playwright instalado: `npx playwright install chromium`
- Node.js 18+

## Comandos

### Backfill completo (todos los buckets)
```bash
node scripts/tokko-panel-backfill.mjs
```

### Backfill de un bucket específico
```bash
node scripts/tokko-panel-backfill.mjs --buckets=new
node scripts/tokko-panel-backfill.mjs --buckets=assigned
node scripts/tokko-panel-backfill.mjs --buckets=new,assigned
```

### Limitar páginas (1 página ≈ 20 webcontacts)
```bash
node scripts/tokko-panel-backfill.mjs --max-pages=50
```

## Output esperado
```
[2026-01-01T12:00:00.000Z] Procesando bucket: new (max 200 páginas)
[2026-01-01T12:00:01.000Z] Página 1: 20 webcontacts
...
[2026-01-01T12:05:00.000Z] Total upsertados: 847
```

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `TOKKO_API_KEY not set` | Falta env var | Verificar `.env.local` |
| `Timeout en Playwright` | Tokko panel lento | Reintentar con `--max-pages=50` en lotes |
| `Supabase: duplicate key` | Normal (upsert) | Ignorar, el upsert resuelve conflictos |

## Script relacionado
- `scripts/tokko-panel-renew-session.mjs` → renueva la sesión del panel si expira
