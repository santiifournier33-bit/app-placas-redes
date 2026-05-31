@AGENTS.md

# app-placas-redes — Claude Context

## Qué es
CRM interno de Freire Propiedades. Gestión de leads, tareas, email, pipeline de ventas, social publishing, documentos y firmas digitales.

## Stack
Next.js 16 App Router · React 19 · TypeScript 5 (strict) · Supabase (PostgreSQL + Auth + RLS) · Zustand · shadcn/ui · Tailwind 4 · Netlify

## Módulos principales
- `src/app/(app)/consultas/` → leads de Zonaprop/Argenprop, matching, respuestas
- `src/app/(app)/productividad/` → tareas, contactos, calendario, equipo
- `src/app/(app)/correo/` → Gmail IMAP sync y gateway
- `src/app/(app)/diseno/` → generación de videos via Remotion + AWS Lambda
- `src/app/(app)/ventas/` → pipeline ventas, operaciones, balances
- `src/app/(app)/servicios/` → gastos, facturas, tipo de cambio
- `src/app/(app)/firmas/` → e-signatures via DocuSeal
- `src/app/(app)/documentacion/` → gestión de documentos por propiedad
- `src/app/api/` → 46 API routes (ver `docs/architecture.md` para mapa completo)

## Librerías críticas
- `src/lib/auth/session.ts` → JWT httpOnly cookie, 7 días, jose
- `src/lib/supabase/` → admin client (bypass RLS) + anon client (respeta RLS)
- `src/lib/stores/` → 8 Zustand stores (ver `docs/architecture.md`)
- `src/lib/tokko/` → wrapper Tokko Broker API (propiedades + leads)
- `src/lib/inquiries/` → enrichment leads desde Zonaprop/Argenprop
- `src/lib/mail/` → IMAP sync Gmail, parsing, envío
- `src/lib/google/` → OAuth2, Calendar API, Tasks API
- `src/lib/llm/` → Gemini (generación de contenido) + Claude API

## Integraciones externas
Ver `docs/integrations.md`. Principales: Tokko Broker, Gmail OAuth2, Google APIs, Zernio (social), n8n, Remotion + AWS Lambda, DocuSeal, Brevo.

## Subagentes disponibles
Ver `AGENTS/` para specs especializadas:
- `AGENTS/GOVERNANCE.md` → **fuente de verdad** sobre plugins/skills/workflows
- `AGENTS/frontend.md` → componentes React, UI, Zustand stores
- `AGENTS/backend.md` → API routes, lib/, integraciones externas
- `AGENTS/security.md` → auditoría de seguridad, hardening pre-deploy
- `AGENTS/database.md` → schema Supabase, migrations, RLS, queries
- `AGENTS/audit.md` → deuda técnica, anti-patterns, complejidad
- `AGENTS/docs.md` → CLAUDE.md, README, architecture.md, runbooks
- `AGENTS/n8n.md` → workflows de automatización n8n

## Plugin Ecosystem (quick-ref)

Jerarquía operativa — detalles completos en `AGENTS/GOVERNANCE.md`:

- **N1 Metodología (siempre):** Superpowers — `brainstorming` → `writing-plans` → `subagent-driven-development` → `verification-before-completion`
- **N2 Dominio funcional:** Supabase, Netlify, Firecrawl, Frontend Design, ui-ux-pro-max, Chrome DevTools, Context7, n8n MCP
- **N3 Calidad:** Security Guidance, `verify`, `code-review`, `security-review`, `deploy`, Claude MD Management
- **N4 Automatización:** Ralph Loop, GitHub (gh CLI), `loop`, `schedule`
- **N5 Utility:** Caveman (hook + skills), `simplify` (post-GREEN solo)

**Reglas críticas de invocación:**
- Tarea NUEVA → `brainstorming` primero. NUNCA saltar al código.
- BUGFIX → `systematic-debugging` (root cause first).
- **REDISEÑO UI/UX** → leer `claude_instructions.md` PRIMERO (4 pasos obligatorios, mobile-first).
- Pre-deploy → `deploy` skill checklist + `security-review`.
- Docs API externa → Context7 (libs conocidas) o Firecrawl (APIs propietarias).

## Workflows especiales

- **Rediseño UI/UX:** leer `claude_instructions.md` PRIMERO (auditoría → preguntas → plan → implementación).
- **Modificación de n8n workflows:** seguir secuencia obligatoria de n8n MCP (`get_sdk_reference` → `search_nodes` → `get_node_types` → write → `validate_workflow` → `create_workflow_from_code`).

## Riesgos conocidos (NO ignorar)
- `Dashboard.tsx` (~82KB) y `SocialPublisherForm.tsx` (~32KB) → god components. No editar directamente; usar subagente frontend con scope acotado.
- Sin tests → validar en browser antes de cualquier PR.
- `tokko-drive-sync/archivos-page.html:7477` → Google Maps API key real hardcodeada en archivo de captura estático. No es producción, pero rotar la key si se hace público el repo.
- `scripts/gmail-zonaprop-backfill.mjs` → IMAP password movido a `GMAIL_IMAP_PASS` env var (fixed). Actualizar `.env.local`.
- Service client Supabase bypassa RLS → filtrado de PII debe hacerse manualmente en server routes.

## Reglas operativas
- Secrets NUNCA en código → solo env vars
- Dark mode first en todo componente nuevo
- Error format consistente: `{ error: string, code: string }`
- Timeout 10s en llamadas HTTP externas
- Validar inputs con Zod en boundary de API routes
- GHL_LOCATION_ID siempre desde `process.env.GHL_LOCATION_ID`

## Deploy
Netlify auto-deploy en push a `main`. Ver `netlify.toml`. Build requiere 8GB heap (`NODE_OPTIONS=--max-old-space-size=8192`).

## Variables de entorno
Ver `.env.local.example` para lista completa.
