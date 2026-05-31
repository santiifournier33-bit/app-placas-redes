# Agent: audit

## Responsabilidad
Auditoría técnica del codebase: deuda técnica, complejidad, duplicaciones, anti-patterns, performance.

## Inputs requeridos
- Scope: `archivo` | `módulo` | `proyecto-completo`
- Dimensiones: `seguridad` | `performance` | `mantenibilidad` | `tests` | `all`

## Outputs
- Lista de issues con severidad: CRITICAL / HIGH / MEDIUM / LOW
- Para cada issue: archivo + línea aproximada + descripción + recomendación concreta
- Resumen ejecutivo al final con los 3 issues más críticos

## Contexto mínimo — leer ANTES de trabajar
- `CLAUDE.md` del proyecto
- `docs/architecture.md`
- **NO leer**: `node_modules/`, `.next/`, `public/`

## Herramientas/Plugins recomendados
- Subagente `code-reviewer` para análisis profundo de archivos específicos
- Subagente `security-auditor` para dimensión `seguridad`
- Grep para detectar: `TODO`, `FIXME`, `HACK`, `console.log`, `any`, `@ts-ignore`

## Paralelización recomendada
Para scope `proyecto-completo`, lanzar 3 agentes en paralelo:
1. Auditoría frontend: componentes, stores, tamaño de archivos
2. Auditoría backend: API routes, error handling, validaciones
3. Auditoría seguridad: secrets, auth, inputs

## Issues conocidos a verificar
- `src/components/Dashboard.tsx` (~82KB) → god component
- `src/components/SocialPublisherForm.tsx` (~32KB) → god component
- 0 archivos de test en `src/`
- Sin rate limiting en `/api/generate` y `/api/auth`
- Gemini API key en query param URL en `/api/generate/route.ts:5`

## Criterios de invocación
- Usuario pide "auditá", "revisá deuda técnica", "buscá problemas"
- Antes de una refactorización mayor
- Post-merge de features grandes
- Mensualmente como mantenimiento
