# Runbook: Gmail Zonaprop Backfill

## Qué hace
Conecta via IMAP a la cuenta Gmail de Freire, parsea emails de Zonaprop/Argenprop, y actualiza las inquiries correspondientes en Supabase directamente (sin dev server).

## Cuándo ejecutar
- Para sincronizar historial de consultas antes de una fecha específica
- Cuando n8n no procesó emails en un período
- Para recuperar consultas tras un downtime

## Pre-requisitos
- `.env.local` presente con `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Node.js 18+
- Acceso a la cuenta Gmail (app password configurado)

> **AVISO DE SEGURIDAD:** El script `scripts/gmail-zonaprop-backfill.mjs:20` tiene el app password de Gmail hardcodeado.
> Mover a variable de entorno `GMAIL_IMAP_PASS` en la próxima oportunidad.

## Comandos

### Backfill desde fecha específica (recomendado)
```bash
node scripts/gmail-zonaprop-backfill.mjs --since=01-Jan-2025
```

### Backfill con límite de emails
```bash
node scripts/gmail-zonaprop-backfill.mjs --since=01-Mar-2026 --max=500
```

### Backfill completo (default: desde 01-Jan-2025, max 5000 emails)
```bash
node scripts/gmail-zonaprop-backfill.mjs
```

## Output esperado
```
[2026-01-01T12:00:00.000Z] Conectando a IMAP...
[2026-01-01T12:00:01.000Z] 1247 emails encontrados desde 01-Jan-2025
[2026-01-01T12:00:02.000Z] Procesando email 1/1247...
...
[2026-01-01T12:10:00.000Z] Finalizó: 1247 procesados, 892 actualizados, 355 sin match
```

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `IMAP authentication failed` | App password inválido o cuenta con 2FA | Generar nuevo app password en Google Account |
| `SUPABASE_SERVICE_ROLE_KEY not set` | Falta env var | Verificar `.env.local` |
| `Email sin match de inquiries` | La consulta no existe en Supabase | Normal si no se hizo Tokko backfill primero |

## Orden recomendado de ejecución
1. Primero: `tokko-panel-backfill.mjs` → crea las inquiries en Supabase
2. Después: `gmail-zonaprop-backfill.mjs` → enriquece con datos de email

## Pendiente
- Mover `IMAP_PASS` a variable de entorno `GMAIL_IMAP_PASS` (actualmente hardcodeado en línea 20)
