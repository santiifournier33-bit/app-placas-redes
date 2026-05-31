# Integraciones Externas — app-placas-redes

## Tokko Broker API

**Qué hace**: CRM propietario argentino para propiedades inmobiliarias. Fuente de verdad de propiedades y algunos leads.

**Wrapper**: `src/lib/tokko/`

**Endpoints usados**:
- `GET /api/v1/property/` → listado paginado de propiedades
- `GET /api/v1/property/{id}/` → detalle de propiedad
- `GET /api/v1/agent/` → agentes inmobiliarios

**Auth**: API Key en query param `key=` (patrón de Tokko, no modificar)

**Env vars**: `TOKKOBROKER_API_KEY`, `TOKKOBROKER_BASE_URL`

**Rate limits**: Sin documentación oficial. Usar con timeout y retry.

**Errores comunes**: Timeout en listados grandes (>500 propiedades). Usar paginación.

**Route que la usa**: `/api/properties`, `/api/property`

---

## Gmail / Google OAuth2

**Qué hace**: Sync de bandeja Gmail de la inmobiliaria para extraer leads de Zonaprop/Argenprop y responder desde la app.

**Wrappers**: `src/lib/mail/`, `src/lib/gmail/`, `src/lib/google/`

**Protocolo**: IMAP (imapflow) para lectura, SMTP (nodemailer) para envío, OAuth2 para auth

**Auth flow**:
1. Usuario inicia OAuth en `/api/google/oauth/authorize`
2. Google redirige a `/api/google/oauth/callback`
3. Tokens guardados en Supabase para reutilización

**Env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**Scope requerido**: `gmail.readonly`, `gmail.send`, `calendar`, `tasks`

**Errores comunes**: Token expirado (refresh automático en wrapper). Cuota de Gmail API.

**Routes que la usan**: `/api/mail/*`, `/api/google/*`

---

## Google APIs (Calendar + Tasks)

**Qué hace**: Sync bidireccional de tareas y eventos de calendario del equipo.

**Wrapper**: `src/lib/google/`

**Funciones**: Crear/actualizar eventos de Calendar, sync Tasks de Google con taskStore

**Auth**: Mismas credenciales OAuth que Gmail

**Env vars**: Mismas que Gmail (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

**Routes que las usan**: `/api/google/sync`, `/api/google/tasks/sync`

---

## Gemini (Google Generative AI)

**Qué hace**: Generación de textos inmobiliarios: copy para redes sociales, descripción Tokko, guión de video, parsing de ubicación.

**Wrapper**: directo en `/api/generate/route.ts` via `callGeminiNative()`

**Modelo**: `gemini-2.5-flash`

**Auth**: Header `x-goog-api-key` (NO query param)

**Env vars**: `GEMINI_API_KEY`

**Rate limits**: 429 manejado en el route con mensaje específico al usuario

**Tipos de generación** (`type` param en POST `/api/generate`):
- `redes_sociales` → 3 variantes en paralelo (catálogo, lifestyle, comercial)
- `tokko_description` → descripción para portal
- `location_parse` → extracción de ubicación estructurada (retorna JSON)
- `video` → guión de locución VO

---

## Zernio (Social Media Publishing)

**Qué hace**: Publica posts (imagen/video) en Instagram, Facebook, LinkedIn, TikTok.

**Wrapper**: `@zernio/node` v0.2.42 (paquete privado)

**Auth**: API Key Zernio + OAuth por red social (tokens almacenados en Supabase)

**Flow**:
1. Usuario conecta cuenta social en `/api/social/auth` → OAuth
2. Callback en `/api/social/callback` guarda tokens
3. Upload media en `/api/social/presign` → S3 presigned URL
4. Publicación en `/api/social/publish`

**Env vars**: `ZERNIO_API_KEY`

**Errores comunes**: Token de red social expirado (refrescar via OAuth nuevamente)

---

## n8n (Workflow Automation)

**Qué hace**: Automatiza tareas de fondo: email sync periódico, data enrichment, notificaciones.

**Instancia**: Self-hosted en Oracle Cloud

**Server prod (MCP)**:
- URL: `http://144.22.45.201:5678/mcp-server/http`
- Auth: JWT Bearer token (almacenado en `.mcp.json` workspace root, NO en este repo)
- Acceso: vía MCP tools de Claude (`n8n-mcp` server registrado)

**Server prod (API)**:
- Usado por `scripts/deploy-n8n-workflows.mjs` para deploys batch
- Env vars: `N8N_BASE_URL`, `N8N_API_KEY` (no usar el JWT del MCP)

**Integración**:
- App llama webhooks n8n para triggers manuales
- n8n llama webhooks de la app:
  - `/api/inquiries/inbound` (verificado con HMAC, `INQUIRIES_WEBHOOK_SECRET`)

**Workflows existentes** (no documentados en repo, viven en n8n):
- Email sync Gmail → Supabase (backfill consultas históricas)
- Tokko panel sync (backfill propiedades)
- Otros: ver Workflows tab en n8n UI

**Deploy de workflows**: `scripts/deploy-n8n-workflows.mjs` (ver `docs/runbooks/deploy-n8n-workflows.md`)

**Riesgo**: el JWT del `.mcp.json` está hardcodeado en plaintext. Rotar si el workspace se hace público. Token actual issued 2026-05-30 sin expiración.

**Ver**: `AGENTS/n8n.md` para crear/modificar workflows con secuencia obligatoria del MCP.

---

## Remotion + AWS Lambda

**Qué hace**: Renderiza videos de propiedades para redes sociales (Reels, Stories).

**Wrappers**: `src/remotion/` (composiciones), `src/app/api/render-video/` (trigger render)

**Flow**:
1. Usuario configura composición en `/diseno/`
2. POST `/api/render-video` → dispara Lambda
3. Video se sube a S3 via `/api/upload-video`

**Auth**: AWS STS + Lambda invocation con credenciales de rol

**Env vars**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_LAMBDA_FUNCTION_NAME`, `AWS_S3_BUCKET`

**Nota**: Render es asíncrono. El build de Remotion es pesado → causa el 8GB heap requirement.

---

## DocuSeal (E-Signatures)

**Qué hace**: Generación y firma de documentos digitales (contratos, mandatos).

**Instancia**: Self-hosted

**Routes**: `/api/signatures/*`

**Auth**: API Key DocuSeal

**Env vars**: `DOCUSEAL_API_KEY`, `DOCUSEAL_BASE_URL`

---

## Brevo (Email Transaccional)

**Qué hace**: Envío de emails transaccionales (notificaciones, confirmaciones).

**Nota**: Reemplazó a Resend (que sigue en deps pero no en uso activo). Remover Resend de `package.json` en Fase 2.

**Env vars**: `BREVO_API_KEY`

---

## Web Push (PWA Notifications)

**Qué hace**: Notificaciones push en browser para recordatorios de tareas.

**Wrapper**: `web-push` + Service Worker en `public/`

**Status**: Implementado pero pendiente activación completa (VAPID keys configuradas, campo `reminder` en taskStore)

**Env vars**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`

**Routes**: `/api/push/*`
