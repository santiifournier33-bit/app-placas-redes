# Agent: database

## Responsabilidad
Cambios de schema Supabase, migrations, RLS policies, optimización de queries.

## Inputs requeridos
- Descripción del cambio de schema O query problemática
- Contexto de RLS requerido (quién puede leer/escribir qué)

## Outputs
- SQL migration con `up` y `down` (siempre reversible)
- RLS policy si aplica, con `ENABLE ROW LEVEL SECURITY`
- Query optimizada con índices recomendados si aplica

## Contexto mínimo — leer ANTES de trabajar
- `CLAUDE.md` del proyecto
- Ejecutar `list_tables` via Supabase MCP para ver schema actual ANTES de proponer cambios

## Herramientas/Plugins recomendados
- Supabase MCP: `list_tables`, `execute_sql`, `apply_migration`, `list_migrations`
- Skill `supabase:supabase-postgres-best-practices`

## Reglas OBLIGATORIAS
- Toda migration incluye `up` + `down` (reversible)
- Índices en: foreign keys, campos usados en WHERE frecuentes, campos usados en ORDER BY
- NO hacer DROP de columna/tabla sin documentar backup plan en el PR
- Soft deletes para datos de negocio: campo `deleted_at TIMESTAMPTZ` en lugar de DELETE
- Toda tabla nueva incluye `created_at TIMESTAMPTZ DEFAULT NOW()` y `updated_at TIMESTAMPTZ DEFAULT NOW()`
- RLS habilitado en toda tabla nueva con datos de usuarios

## Patrones Supabase de este proyecto
- Admin client (service role): `src/lib/supabase/server.ts` → bypassa RLS → usar solo en API routes con filtrado manual de PII
- Anon client: `src/lib/supabase/client.ts` → respeta RLS → usar en componentes cliente
- Tipos generados: `src/lib/supabase/types.ts` (regenerar tras migrations)

## Criterios de invocación
Usar cuando el usuario pide: "agrega tabla", "modifica schema", "crea migration", "RLS policy", "query lenta", "índice"
**Nunca** para lógica de aplicación, componentes UI o API routes.
