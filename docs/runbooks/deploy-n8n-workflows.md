# Runbook: Deploy n8n Workflows

## Qué hace
Despliega dos workflows al server n8n de producción (Oracle Cloud):
1. **Real-time enrich** (cron Gmail Trigger): captura emails Zonaprop, parsea, actualiza inquiries en Supabase.
2. **Backfill historical** (manual trigger): procesa emails históricos en lote.

Ambos workflows son "all-native" — no llaman a endpoints externos de la app, solo a Supabase REST.

## Cuándo ejecutar
- Setup inicial del proyecto
- Re-deploy tras cambios en el parser o la lógica de matching
- Recovery: si los workflows en n8n fueron borrados/corrompidos

## Pre-requisitos
- Node.js 18+
- Acceso a n8n prod (`http://144.22.45.201:5678`)
- Credential Gmail OAuth ya configurada en n8n (ver `docs/INFRAESTRUCTURA-FREIRE.md` para crearla)
- Su `id` debe estar hardcodeado en el script (`GMAIL_CRED_ID`)

## ⚠️ Riesgo de seguridad

```
scripts/deploy-n8n-workflows.mjs:7   ← N8N_API_KEY hardcodeado
scripts/deploy-n8n-workflows.mjs:10  ← SUPABASE_SERVICE_KEY hardcodeado
```

**Antes de commitear cualquier cambio al script:**
1. Rotar la N8N API key si el repo se va a hacer público
2. Considerar mover ambas a env vars (`N8N_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

## Comando

```bash
node scripts/deploy-n8n-workflows.mjs
```

No tiene flags — siempre deploya los dos workflows (real-time + backfill).

## Output esperado

```
[xxx] Buscando workflow existente "Zonaprop Enrich (Real-time)"...
[xxx] Workflow nuevo. Creando...
[xxx] Workflow creado: ID=abc123
[xxx] Buscando workflow existente "Zonaprop Backfill (Manual)"...
[xxx] Workflow nuevo. Creando...
[xxx] Workflow creado: ID=def456
[xxx] Listo. Activar manualmente desde el UI si es necesario.
```

Si los workflows ya existen, los **sobrescribe** (no crea duplicados).

## Verificación post-deploy

1. Abrir `http://144.22.45.201:5678/`
2. Login con cuenta admin
3. Workflows tab: ver "Zonaprop Enrich (Real-time)" y "Zonaprop Backfill (Manual)"
4. Activar manualmente (toggle "Active")
5. Ejecutar test manual del backfill (Execute Workflow)
6. Verificar logs sin errores

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `401 Unauthorized` | N8N API key expirada o inválida | Regenerar API key en n8n UI → Settings → API. Actualizar línea 7 del script. |
| `Credential not found: GMAIL_CRED_ID` | El ID `ryCUBXAnWV1bfcyA` no existe en n8n | Ir a n8n → Credentials, encontrar la credential Gmail OAuth, copiar su ID, actualizar `GMAIL_CRED_ID` en línea 8 |
| `Supabase: 401` | Service role key expirada | Regenerar en Supabase Dashboard → Project Settings → API. Actualizar línea 10. |

## Script relacionado
- `scripts/deploy-n8n-backfill.mjs` — variante que solo deploya el workflow de backfill (no el real-time)
