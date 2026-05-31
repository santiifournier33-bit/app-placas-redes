# Runbook: Purge Test Data

## Qué hace
Borra contacts e inquiries de Supabase que fueron creados durante testing del sistema. Identifica registros por:
- Emails de prueba (lista hardcodeada de 5 emails)
- Sufijos de teléfono (últimos 10 dígitos, lista hardcodeada de 2)
- Patrones de nombre estrictos (lista hardcodeada de 2)

## ⚠️ Operación destructiva

Este script **borra data permanentemente**. Por default corre en **dry-run** (solo cuenta). Para realmente borrar, pasar `--apply`.

## Cuándo ejecutar
- Después de sesiones de testing manual que ensuciaron la DB con datos de prueba
- Antes de demos o presentaciones
- Como parte de cleanup de QA

## Pre-requisitos
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
- Confirmar que los emails/teléfonos/nombres hardcodeados son los correctos (ver líneas 20-32 del script)

## Comandos

### Paso 1: Dry-run (SIEMPRE primero)

```bash
node scripts/purge-test-data.mjs
```

Output esperado:
```
[DRY RUN] Found 12 contacts matching test patterns
[DRY RUN] Would delete: contact_id=abc... (email: santiifournier33@gmail.com)
[DRY RUN] Would delete: contact_id=def... (phone suffix: 1151454915)
[DRY RUN] Total: 12 contacts + 47 inquiries
```

### Paso 2: Apply (solo después de revisar dry-run)

```bash
node scripts/purge-test-data.mjs --apply
```

Output esperado:
```
[APPLY] Deleting 12 contacts and 47 inquiries...
[APPLY] Done. 12 contacts deleted, 47 inquiries deleted.
```

## Identificadores hardcodeados (editar el script si cambian)

**Emails de testing** (`scripts/purge-test-data.mjs:20-26`):
- santiifournier33@gmail.com
- skiddyssj@gmail.com
- skiddy33ssj@gmail.com
- freirepropiedadespilar@gmail.com
- stellamaris_freire@hotmail.com

**Phone suffixes** (`scripts/purge-test-data.mjs:29`):
- 1151454915
- 1139447112

**Name patterns** (`scripts/purge-test-data.mjs:32`):
- stella maris freire
- santiago fournier

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY not set` | Falta env var | Completar `.env.local` |
| `Foreign key violation` | Inquiries apuntan al contact, borrar inquiries primero | El script maneja el orden — si falla, revisar logs |
| Borró menos de lo esperado | Patterns no matcheaban | Ajustar listas hardcodeadas y re-correr dry-run |

## Recovery (si borraste algo por error)

Supabase tiene **Point-in-Time Recovery** (Project Settings → Database → Backups). Solicitar restore al timestamp pre-purge. Considerar que pierdes data nueva creada después.
