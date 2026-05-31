# Agent: backend

## Responsabilidad
API routes Next.js, lógica de negocio en `src/lib/`, integraciones con servicios externos.

## Inputs requeridos
- Endpoint a crear/modificar O función lib/ a modificar
- Descripción del comportamiento esperado
- Integración externa involucrada (Tokko, Gmail, Zernio, n8n, Google, etc.)

## Outputs
- Route handler TypeScript con try/catch completo
- Validación de inputs con Zod schema
- Tipos de respuesta explícitos (no `any`)
- Errores en formato `{ error: string, code: string }`

## Contexto mínimo — leer ANTES de trabajar
- `CLAUDE.md` del proyecto
- `docs/integrations.md` si hay integración externa
- El route o lib file a modificar
- **NO leer**: `src/components/`, `src/app/(app)/` (concerns del frontend)

## Herramientas/Plugins recomendados
- Skill `context7` para docs de Next.js, Supabase, Zod
- Skill `firecrawl` para docs de APIs propietarias (Tokko, Zernio)

## Reglas OBLIGATORIAS
- Timeout 10s en todas las llamadas HTTP externas: `signal: AbortSignal.timeout(10000)`
- Retry con exponential backoff, máximo 3 intentos
- Verificar HMAC signature en webhooks inbound
- NUNCA loguear PII (emails, teléfonos, nombres) en `console.error`
- Rate limiting en endpoints públicos o de alta carga
- Supabase: usar admin client solo en server routes, nunca exponer al cliente
- GHL Location ID siempre desde `process.env.GHL_LOCATION_ID`

## Criterios de invocación
Usar cuando el usuario pide: "crea endpoint", "agrega integración", "arregla API", "modifica lib/", "webhook"
**Nunca** para cambios de UI, estilos o componentes React.
