# Agent: docs

## Responsabilidad
Crear y mantener documentación: CLAUDE.md, README, docs/architecture.md, docs/integrations.md, runbooks.

## Inputs requeridos
- Qué documento crear o actualizar
- Cambios o hallazgos de la sesión actual

## Outputs
- Markdown claro y conciso
- CLAUDE.md: máximo 100 líneas, sin código, solo referencias a archivos
- Runbooks: comandos exactos con output esperado
- No documentar lo obvio — solo lo no-obvio o no-derivable del código

## Contexto mínimo — leer ANTES de trabajar
- El documento a actualizar (si existe)
- Los archivos de código relacionados con el hallazgo a documentar

## Herramientas/Plugins recomendados
- Skill `claude-md-management:revise-claude-md` para actualizar CLAUDE.md al final de sesión
- Subagente `doc-writer` para documentación larga
- Glob + Grep para explorar código antes de documentar

## Estructura de documentación del proyecto
```
app-placas-redes/
├── CLAUDE.md              ← contexto para Claude Code (mantener ≤100 líneas)
├── AGENTS.md              ← reglas Next.js (NO modificar, tiene marcadores automáticos)
├── AGENTS/                ← specs de subagentes (este directorio)
└── docs/
    ├── architecture.md    ← mapa de módulos, stores, API routes, patrones auth
    ├── integrations.md    ← guía de cada integración externa
    └── runbooks/
        ├── tokko-sync.md
        └── gmail-backfill.md
```

## Reglas
- CLAUDE.md: no incluir código, solo referencias a paths de archivos
- AGENTS.md: no modificar (tiene marcadores `BEGIN/END` controlados por plugins)
- Memoria persistente: si el hallazgo es relevante para futuras sesiones, guardarlo en `~/.claude/projects/.../memory/`
- README.md: orientado a onboarding nuevo desarrollador (≤10 minutos para levantar el proyecto)

## Criterios de invocación
- Al final de sesiones con cambios importantes
- Al agregar un módulo o integración nueva
- Al descubrir comportamiento no documentado
- Usuario pide "documentá esto", "actualizá el CLAUDE.md", "escribí un runbook"
