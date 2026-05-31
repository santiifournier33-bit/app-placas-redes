# Plugin & Skill Governance — app-placas-redes

> Fuente única de verdad para uso de plugins, skills y agentes en este proyecto.
> Verificada contra filesystem real de `~/.claude/plugins/cache/`.
> Última actualización: 2026-05-30.

---

## A. PLUGIN CAPABILITY MATRIX

### Layer 1 — Methodology (Authority)

| Plugin | Skills | Cuándo dominar |
|---|---|---|
| **Superpowers** (14 skills) | `using-superpowers`, `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch`, `using-git-worktrees`, `writing-skills` | SIEMPRE. Define cómo trabajar antes de qué herramienta usar. |

### Layer 2 — Domain Functional

| Plugin | Skills | Cuándo dominar |
|---|---|---|
| **Supabase** | `supabase`, `supabase-postgres-best-practices` + MCP (`list_tables`, `execute_sql`, `apply_migration`, `list_migrations`, `get_advisors`, `get_logs`) | Schema changes, RLS, migrations, query optimization |
| **Netlify Skills** (13 skills) | `netlify-deploy`, `netlify-cli-and-deploy`, `netlify-config`, `netlify-edge-functions`, `netlify-functions`, `netlify-blobs`, `netlify-caching`, `netlify-database`, `netlify-ai-gateway`, `netlify-forms`, `netlify-identity`, `netlify-image-cdn`, `netlify-frameworks` | Deploy, edge functions, build troubleshooting |
| **Firecrawl** (8 skills) | `firecrawl-scrape`, `firecrawl-crawl`, `firecrawl-search`, `firecrawl-map`, `firecrawl-agent`, `firecrawl-cli`, `firecrawl-download`, `firecrawl-instruct` | Documentar APIs propietarias (Tokko, Zernio, Zonaprop), generar skill desde URL |
| **Chrome DevTools MCP** (6 skills) | `chrome-devtools`, `chrome-devtools-cli`, `debug-optimize-lcp`, `a11y-debugging`, `memory-leak-debugging`, `troubleshooting` + MCP tools | Debugging visual, performance LCP, accesibilidad, memory leaks |
| **Frontend Design** | `frontend-design` | Standards estéticas en componentes nuevos |
| **addy-agent-skills** | `ui-ux-pro-max`, `deploy`, `fix-issue`, `pr-review` | UI/UX (overlap con frontend-design — ver Resolución) |
| **Context7** (MCP, no skills) | `query-docs`, `resolve-library-id` | Docs de librerías conocidas (Next.js, Supabase, Zod, React) |
| **n8n MCP** | MCP tools (`get_sdk_reference`, `search_nodes`, `get_node_types`, `create_workflow_from_code`, etc.) | Workflows automatización en server prod (ver `.mcp.json` workspace) |

### Layer 3 — Quality Gates

| Plugin | Skills | Cuándo dominar |
|---|---|---|
| **Security Guidance** | Guidelines integradas en sistema | Pre-deploy, nuevos endpoints públicos, cambios auth |
| **Claude MD Management** | `claude-md-improver`, `revise-claude-md` | Fin de sesión con cambios importantes |
| **Code Simplifier** | `simplify` (slash command) | Post-implementación ÚNICAMENTE — nunca en RED phase TDD |
| **Standalone skills** | `verify`, `run`, `review`, `security-review`, `code-review`, `deploy` (addy), `pr-review` (addy) | Quality checks específicos |

### Layer 4 — Automation

| Plugin | Skills | Cuándo dominar |
|---|---|---|
| **Ralph Loop** | `ralph-loop`, `cancel-ralph`, `help` | Polling de CI/deploy, tasks de larga duración |
| **GitHub** | Usa `gh` CLI via Bash | PRs, issues, reviews al cerrar features |
| **Standalone skills** | `loop`, `schedule` | Tareas recurrentes |

### Layer 5 — Utility (Transparente)

| Plugin | Skills | Comportamiento |
|---|---|---|
| **Caveman** | `caveman`, `caveman-commit`, `caveman-review`, `compress`, `caveman-help` + **hooks SessionStart/UserPromptSubmit** | Hook siempre activo. Skills invocables a demanda. |
| **Standalone slash commands** | `init`, `update-config`, `fewer-permission-prompts`, `keybindings-help`, `claude-api`, `statusline-setup` | Configuración de Claude Code |

---

## B. GOVERNANCE MODEL

### Jerarquía de Autoridad

```
N1 — METODOLOGÍA (Superpowers)
  Define proceso. Nunca salteable.
  brainstorming → writing-plans → executing/subagent → verification

N2 — DOMINIO FUNCIONAL
  Supabase                  → database/schema/RLS
  Netlify                   → deploy/infra/edge
  Firecrawl                 → research APIs externas
  Frontend Design           → standards estéticas
  ui-ux-pro-max             → diseño nuevo con stack genérico
  claude_instructions.md    → REDESIGN UI/UX (4 pasos, mobile-first)
  Chrome DevTools           → debugging visual/perf/a11y
  Context7                  → docs librerías conocidas
  n8n MCP                   → workflows en prod (Oracle Cloud)

N3 — CALIDAD
  Security Guidance + security-review → pre-deploy siempre
  Claude MD Management                → fin de sesión
  Code Simplifier (simplify)          → post-GREEN ÚNICAMENTE
  verify, code-review, review         → antes de marcar "listo"
  deploy (skill)                      → checklist pre-push prod

N4 — UTILIDAD
  Caveman          → siempre activo (hook)
  loop, schedule   → tareas recurrentes
```

### Resolución de Conflictos

| Conflicto | Regla |
|---|---|
| `ui-ux-pro-max` vs `frontend-design` | `frontend-design` = standards (cómo se ve). `ui-ux-pro-max` = decisiones de diseño nuevo (qué stack/patrón). Usar ambos: pro-max decide, design valida. |
| `claude_instructions.md` vs `frontend-design`/`ui-ux-pro-max` | **`claude_instructions.md` TIENE PRECEDENCIA** para cualquier rediseño en app-placas-redes. Los otros son fallback si la tarea no es rediseño. |
| Superpowers brainstorming vs ui-ux-pro-max | Brainstorming primero (WHAT). ui-ux-pro-max después (HOW). |
| `deploy` skill vs Netlify Skills | `deploy` = checklist pre-push. Netlify Skills = mecánica del deploy. `deploy` ANTES, Netlify Skills DURANTE. |
| `pr-review` vs `code-review` vs `review` | `pr-review` = review completo de PR ya creado. `code-review` = diff local con opciones (ultra, --fix, --comment). `review` = review de PR (similar a pr-review). Default: `code-review` para diff local, `pr-review` para PRs creados. |
| Context7 vs Firecrawl | Context7 = librerías conocidas (Next, Supabase). Firecrawl = APIs propietarias (Tokko, Zernio). |
| Code Simplifier vs TDD RED | Simplifier SOLO post-GREEN. |
| Security Guidance vs velocidad | Security gana pre-deploy. Defer en desarrollo. |
| Memory rules vs codigo actual | Memory siempre verificar contra código real antes de aplicar (memorias pueden estar stale). |

---

## C. SKILL USAGE POLICY

### Entry Gate (toda acción)

```
1. Caveman hook activo → tone comprimido por default
2. Capability Check → ¿skill/plugin/MCP resuelve esto?
   ├── SÍ → invocar. Documentar invocation pattern si nuevo.
   └── NO → proceder con razonamiento + actualizar AGENTS/ si patrón emerge
3. Superpowers Gate → ¿es tarea nueva o bugfix?
   ├── NUEVA → brainstorming → writing-plans → executing/subagent
   └── BUGFIX → systematic-debugging → TDD → verification
4. Domain Selection → seleccionar plugin Layer 2 según scope
5. Quality Gates al cerrar → verify, code-review, security-review si aplica
```

### Triggers automáticos (hooks)

| Hook | Trigger | Acción |
|---|---|---|
| SessionStart (caveman) | Cada sesión nueva | Activa modo full por default |
| UserPromptSubmit (caveman) | Cada prompt usuario | Refuerza modo activo |

### Skills standalone (uso explícito)

| Skill | Uso | Cuándo invocar |
|---|---|---|
| `verify` | Verifica cambio funcionando en app | Después de implementar feature visible |
| `run` | Lanza app para inspeccionar | Probar UI o backend live |
| `review` | Review de PR existente | Al recibir PR |
| `security-review` | Audit de seguridad | Antes de merge a main |
| `code-review` | Review de diff local (low/med/high/ultra/--fix/--comment) | Pre-PR |
| `deploy` | Pre-deploy checklist | Antes de push a producción |
| `pr-review` (addy) | Review completo de PR | Al recibir PR |
| `fix-issue` (addy) | Fix de GitHub issue | Al trabajar issue específico |
| `loop` | Run de prompt en intervalo | Polling o tareas recurrentes |
| `schedule` | Cron-based remote agents | Tareas programadas |
| `simplify` | Equivalente a `code-review --fix` | Post-implementación |
| `update-config` | Modifica settings.json | Configurar hooks, permisos, env vars |

---

## D. SUPERPOWERS INTEGRATION BLUEPRINT

### Workflow: Feature nueva

```
1. using-superpowers       → ¿qué skills aplican?
2. brainstorming           → diseño, intención
3. writing-plans           → plan TDD bite-sized
4. using-git-worktrees     → workspace aislado (desde staging branch)
5. subagent-driven-development → fresh subagent por tarea
   ├── implementer (con AGENTS/ relevante)
   ├── spec reviewer
   └── code quality reviewer
6. verification-before-completion → evidencia
7. code-review --comment   → review pre-PR (o pr-review si PR ya existe)
8. security-review         → si toca endpoints/auth/deploy
9. deploy (skill)          → checklist pre-prod
10. finishing-a-development-branch → merge/PR
11. claude-md-improver     → actualizar CLAUDE.md
```

### Workflow: Bug fix

```
1. systematic-debugging    → 4 fases (root cause first)
2. test-driven-development → test que falla por el bug
3. fix mínimo
4. verification-before-completion → fix funciona
5. caveman-commit          → commit comprimido
```

### Workflow: Rediseño UI/UX

```
1. LEER ../claude_instructions.md PRIMERO ← OBLIGATORIO (playbook 4 pasos)
2. LEER AGENTS/skills/design-taste-frontend.md ← skill anti-slop frontend del proyecto
3. Paso 1: Auditoría (Scan & Diagnose)
4. Paso 2: Reportar + hacer preguntas → ESPERAR confirmación user
5. Paso 3: Planificación (writing-plans)
6. Paso 4: Implementación incremental
   ├── design-taste-frontend skill → reglas anti-mediocridad (precedencia)
   ├── ui-ux-pro-max para decisiones de stack/patrón
   ├── frontend-design para validar standards
   └── chrome-devtools para verificar visual/a11y
7. verify / run para probar en browser
8. code-review --fix
```

**Local project skills:** ver `AGENTS/skills/`. Estos skills viven dentro del proyecto y aplican solo a `app-placas-redes` (no son plugins globales).

### Workflow: Research APIs externas

```
1. Context7 si es librería conocida
2. Firecrawl si es API propietaria
   ├── firecrawl-scrape para página única
   ├── firecrawl-crawl para sitio completo
   ├── firecrawl-map para listar URLs
   └── firecrawl-instruct para generar skill desde URL
3. Actualizar docs/integrations.md
```

### Workflow: Deploy

```
1. deploy (skill) → checklist
2. security-review → si toca endpoints/auth
3. Netlify Skills (netlify-deploy) → preview first, prod después
4. Ralph Loop o loop skill → monitor build si largo
5. verify → app responde correctamente post-deploy
```

### Workflow: n8n workflow nuevo o modificación

```
1. Leer docs/integrations.md sección n8n
2. n8n MCP secuencia obligatoria:
   ├── get_sdk_reference
   ├── search_nodes (para servicios necesarios)
   ├── get_node_types (parámetros exactos)
   ├── escribir workflow code
   ├── validate_workflow
   └── create_workflow_from_code (o update_workflow)
3. Documentar trigger y comportamiento esperado
```

---

## E. CONTEXTUAL ARCHITECTURE

### Estructura documental

```
atnigravitty/
├── .mcp.json                                    ← n8n production server config (JWT)
└── app-placas-redes/
    ├── CLAUDE.md                                ← contexto + quick-ref plugins
    ├── AGENTS.md                                ← Next.js 16 rules (no tocar)
    ├── claude_instructions.md                   ← Playbook UI/UX (precedencia en redesigns)
    ├── README.md
    ├── AGENTS/
    │   ├── GOVERNANCE.md                        ← este archivo
    │   ├── frontend.md, backend.md, security.md, database.md
    │   ├── audit.md, docs.md, n8n.md
    │   └── skills/
    │       └── design-taste-frontend.md         ← skill anti-slop frontend (local project)
    └── docs/
        ├── architecture.md, integrations.md, env-vars.md
        ├── INFRAESTRUCTURA-FREIRE.md
        ├── git-workflow.md
        └── runbooks/
            ├── INDEX.md                          ← tabla 18 scripts
            ├── tokko-sync.md, gmail-backfill.md
            ├── deploy-n8n-workflows.md           ← crítico
            ├── purge-test-data.md                ← destructivo
            ├── backfill-inactive-inquiries.md
            ├── sync-zonaprop-locations.md
            └── tokko-panel-renew-session.md
```

### Ownership

| Archivo | Owner | Cuándo actualizar |
|---|---|---|
| `AGENTS/GOVERNANCE.md` | Arquitecto sistema | Al cambiar plugin set o agregar skill |
| `CLAUDE.md` quick-ref | Claude (fin sesión) | Via `claude-md-improver` |
| `claude_instructions.md` | User (decisiones diseño) | Antes de cada redesign cycle |
| `docs/INFRAESTRUCTURA-FREIRE.md` | User (credenciales) | Cuando cambia infra |
| `docs/runbooks/*` | Claude (sesiones con scripts) | Al ejecutar script no documentado |
| `AGENTS/*.md` dominio | Dominio + Claude | Al descubrir patrones |

---

## REGLAS VINCULANTES (de memoria persistente)

Las siguientes reglas son no-negociables y aplican a todas las sesiones:

1. **Service-client Supabase**: Server routes deben usar service-role client + filtrar PII manualmente. RLS bloquea cross-owner reads. Cuidado con URL-length en `.in()` con muchos UUIDs.
2. **GHL Location ID**: `vLeAYUiyvUMIhRMyjWtd` (Freire sub-account). Siempre desde `process.env.GHL_LOCATION_ID`.
3. **Push Notifications**: Pendiente activación completa (VAPID keys configuradas, campo `reminder` ya en taskStore).
4. **God components**: `Dashboard.tsx` y `SocialPublisherForm.tsx` NO editar sin scope acotado.
5. **Dark mode first**: Todo componente nuevo soporta dark mode por default.
6. **Secrets**: NUNCA en código. Solo env vars.
7. **Tests**: 15 tests en `src/tests/lib/` (rate-limit + auth-session). Correr `npm run test` antes de merge.
