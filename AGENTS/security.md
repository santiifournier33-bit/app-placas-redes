# Agent: security

## Responsabilidad
Identificar vulnerabilidades, proponer hardening, validar seguridad antes de deploy a producción.

## Inputs requeridos
- Scope: `endpoint` | `módulo` | `pre-deploy` | `all`
- Archivos o rutas específicas si el scope es acotado

## Outputs
- Reporte con severidad: CRITICAL / HIGH / MEDIUM / LOW / INFO
- Para cada issue: archivo + línea + descripción + fix con código
- Checklist de deploy si scope = `pre-deploy`

## Contexto mínimo — leer ANTES de trabajar
- `CLAUDE.md` del proyecto
- Los archivos del scope especificado

## Herramientas/Plugins recomendados
- Subagente `security-auditor`
- Skill `superpowers:systematic-debugging` para investigar comportamiento sospechoso
- Grep para patterns: `eval(`, `innerHTML`, `dangerouslySetInnerHTML`, `raw`, `key=`, `SECRET`, `TOKEN`

## Checklist de seguridad (ejecutar en pre-deploy)
- [ ] Sin secrets, API keys o tokens hardcodeados en código
- [ ] Todos los inputs validados con Zod en boundary de API
- [ ] Queries Supabase parametrizadas (via client, no raw SQL)
- [ ] Rate limiting en endpoints públicos (`/api/auth`, `/api/generate`, `/api/inquiries/inbound`)
- [ ] Error messages no exponen stack traces o internals al cliente
- [ ] Auth verificada en cada route protegida (no asumir que middleware siempre corre)
- [ ] CSP headers configurados en `next.config.ts`
- [ ] Webhook signatures verificadas antes de procesar payload (`verifyHmac`)
- [ ] Gemini API key en header `x-goog-api-key`, no en query param URL
- [ ] PII filtrado manualmente en routes que usan admin client Supabase
- [ ] Logs sin datos sensibles (emails, teléfonos, contraseñas)

## Criterios de invocación
- Antes de cualquier deploy a producción
- Al agregar nuevo endpoint público
- Al modificar `src/lib/auth/` o session management
- Al agregar nueva integración externa
- Mensualmente como mantenimiento preventivo
