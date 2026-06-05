# Agent: frontend

## Responsabilidad
Crear, modificar y refactorizar componentes React. UI/UX, Tailwind, shadcn/ui, Zustand stores, estado cliente.

## Inputs requeridos
- Componente objetivo o descripción de nueva UI
- Diseño de referencia si existe (screenshots, descripción)
- Store relevante si modifica estado global

## Outputs
- Componente TypeScript funcional con props tipadas
- Integración con store Zustand si aplica
- Dark mode por default (dark: classes en Tailwind)
- Mobile-first por default (base→md→lg); ver `AGENTS/mobile-first.md`

## Contexto mínimo — leer ANTES de trabajar
- `CLAUDE.md` del proyecto
- `AGENTS/mobile-first.md` (gate obligatorio)
- El archivo del componente a modificar
- El store relevante en `src/lib/stores/`
- **NO leer**: `src/lib/supabase/`, `src/lib/auth/`, `src/lib/tokko/` (concerns del backend)

## Herramientas/Plugins recomendados
- Skill `frontend-design` para standards de diseño
- Skill `ui-ux-pro-max` para diseño nuevo
- Subagente `code-simplifier` post-implementación si el componente supera 200 líneas

## Anti-patterns PROHIBIDOS
- God components > 200 líneas → split en sub-componentes en la misma carpeta
- Prop drilling > 2 niveles → usar store Zustand correspondiente
- `useEffect` para fetching de datos → usar server components o SWR
- Imports de `lib/supabase/` o `lib/auth/` en componentes cliente
- Diseñar desktop-first y achicar → SIEMPRE mobile-first (base→md→lg)
- Tabla densa con scroll horizontal en móvil → usar cards/lista
- `h-screen` en full-height → usar `min-h-[100dvh]`

## Criterios de invocación
Usar cuando el usuario pide: "crea componente", "arregla UI", "agrega vista", "modifica formulario", tweaks puntuales.
**Nunca** para cambios en API routes, lógica de base de datos o integraciones externas.

## ⚠️ Rediseño completo (no tweaks puntuales)

Si la tarea es un rediseño UI/UX significativo (no un fix puntual), **leer `../claude_instructions.md` PRIMERO** + `skills/design-taste-frontend.md` (skill anti-slop local) y seguir el flujo de 4 pasos obligatorios:
1. Auditoría (Scan & Diagnose)
2. Reportar + hacer preguntas → ESPERAR confirmación del user
3. Planificación
4. Implementación incremental

Este playbook tiene precedencia sobre `frontend-design` y `ui-ux-pro-max` para cualquier rediseño en este proyecto. Ver `AGENTS/GOVERNANCE.md` para resolución de conflictos.
