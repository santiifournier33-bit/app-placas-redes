# Arquitectura — app-placas-redes

## Estructura de directorios

```
src/
├── app/
│   ├── (app)/          ← rutas protegidas (requieren auth)
│   │   ├── consultas/  ← leads/inquiries
│   │   ├── productividad/ ← tareas, contactos, calendario, equipo
│   │   ├── correo/     ← Gmail IMAP gateway
│   │   ├── diseno/     ← generación de videos y contenido IA
│   │   ├── ventas/     ← pipeline y operaciones de venta
│   │   ├── servicios/  ← gastos, facturas, dólar
│   │   ├── firmas/     ← e-signatures DocuSeal
│   │   ├── documentacion/ ← docs por propiedad
│   │   ├── marketing/
│   │   └── procedimientos/
│   ├── (auth)/
│   │   └── login/
│   └── api/            ← 46 API routes (ver mapa abajo)
├── components/         ← 104 componentes React
│   ├── ui/             ← primitivos shadcn/ui
│   ├── nav/            ← AppShell, sidebar, navegación
│   ├── consultas/
│   ├── productividad/
│   └── ...             ← carpetas por módulo
└── lib/                ← lógica de negocio, NO UI
    ├── auth/
    ├── supabase/
    ├── stores/
    ├── tokko/
    ├── inquiries/
    ├── mail/
    ├── gmail/
    ├── google/
    ├── llm/
    └── ...
```

---

## Mapa de API Routes

| Route | Método | Descripción |
|---|---|---|
| `/api/auth` | POST/DELETE | Login y logout de sesión |
| `/api/auth/me` | GET | Usuario autenticado actual |
| `/api/consultas/contact/[id]` | GET/PATCH | Detalle y actualización de contacto de consulta |
| `/api/consultas/inquiry/[id]/responded` | POST | Marcar consulta como respondida |
| `/api/consultas/matches` | POST | Matching de propiedad con consulta |
| `/api/docs/property/[id]` | GET | Documentos de una propiedad |
| `/api/docs/property/[id]/file` | POST/DELETE | Subir o eliminar archivo de propiedad |
| `/api/docs/status` | GET | Estado de documentación de propiedades |
| `/api/docs/sync` | POST | Sincronizar docs con fuente externa |
| `/api/docs/debug-files` | GET | Debug de archivos (solo dev) |
| `/api/generate` | POST | Generación de contenido IA via Gemini (tipos: redes_sociales, tokko_description, location_parse, video) |
| `/api/google/oauth/authorize` | GET | Iniciar OAuth Google |
| `/api/google/oauth/callback` | GET | Callback OAuth Google |
| `/api/google/sync` | POST | Sync Google Calendar |
| `/api/google/tasks/sync` | POST | Sync Google Tasks |
| `/api/inquiries/inbound` | POST | Webhook inbound leads (HMAC verificado) |
| `/api/inquiries/zonaprop-enrich` | POST | Enriquecer lead con datos Zonaprop |
| `/api/mail/login` | POST | Autenticar cuenta Gmail IMAP |
| `/api/mail/folders` | GET | Carpetas Gmail |
| `/api/mail/messages` | GET | Mensajes de carpeta |
| `/api/mail/read` | POST | Marcar mensaje como leído |
| `/api/mail/action` | POST | Acciones sobre mensaje (responder, archivar) |
| `/api/mail/send` | POST | Enviar email |
| `/api/mail/agents` | GET | Agentes disponibles |
| `/api/media` | POST | Upload de media |
| `/api/procedures/chat` | POST | Chat con IA sobre procedimientos internos |
| `/api/properties` | GET | Listado de propiedades desde Tokko |
| `/api/property` | GET | Propiedad individual desde Tokko |
| `/api/push/subscribe` | POST | Suscribir a push notifications |
| `/api/push/test` | POST | Test de push notification |
| `/api/render-video` | POST | Renderizar video via Remotion + AWS Lambda |
| `/api/servicios/dolar` | GET | Tipo de cambio dólar actual |
| `/api/signatures/create` | POST | Crear documento para firma DocuSeal |
| `/api/signatures/list` | GET | Listar documentos de firma |
| `/api/signatures/templates` | GET | Templates de firma disponibles |
| `/api/social/auth` | GET | Iniciar OAuth red social |
| `/api/social/callback` | GET | Callback OAuth social |
| `/api/social/accounts` | GET | Cuentas sociales conectadas |
| `/api/social/accounts/disconnect` | DELETE | Desconectar cuenta social |
| `/api/social/presign` | POST | Presign URL para upload de media a Zernio |
| `/api/social/publish` | POST | Publicar post en red social |
| `/api/upload-video` | POST | Upload de video a AWS S3 |
| `/api/ventas/activities` | GET/POST | Actividades de venta |
| `/api/ventas/balance` | GET | Balance de comisiones |
| `/api/ventas/operations` | GET/POST | Operaciones de venta |
| `/api/ventas/sync-agents` | POST | Sync agentes desde Tokko |

---

## Zustand Stores (estado cliente)

| Store | Archivo | Responsabilidad |
|---|---|---|
| `taskStore` | `src/lib/stores/taskStore.ts` | Tareas con secciones, tipos (tarea/visita/llamada/reunion/firma/cafe/item_valor), recurrencia |
| `contactStore` | `src/lib/stores/contactStore.ts` | Contactos con etapas de pipeline (`ContactPipeline`) |
| `pipelinesStore` | `src/lib/stores/pipelinesStore.ts` | Etapas de pipeline de ventas (`PipelineStage`) |
| `serviciosStore` | `src/lib/stores/serviciosStore.ts` | Gastos y servicios |
| `calendarStore` | `src/lib/stores/calendarStore.ts` | Eventos de calendario |
| `teamStore` | `src/lib/stores/teamStore.ts` | Miembros del equipo |
| `useConsultasBadge` | `src/lib/stores/useConsultasBadge.ts` | Badge count de consultas sin responder |
| `resetAllStores` | `src/lib/stores/resetAllStores.ts` | Utilidad para resetear todos los stores (logout) |

Todos los stores usan `src/lib/supabase/client.ts` (anon client, respeta RLS).

---

## Patrón de Autenticación

```
1. Usuario POST /api/auth con email + password
2. Supabase Auth valida credenciales
3. Server crea JWT con jose → cookie httpOnly, sameSite=lax, secure en prod, 7 días
4. Cada request protegido → middleware lee cookie → valida JWT
5. src/lib/auth/session.ts → getSession() / setSession() / clearSession()
```

**Roles**: `admin` y `asesor`. Los asesores solo ven sus propios registros (PII masking manual en server routes).

---

## Patrón Supabase: Admin Client vs Anon Client

| Client | Archivo | Cuándo usar |
|---|---|---|
| Admin (service role) | `src/lib/supabase/server.ts` | API routes server-side. Bypassa RLS → filtrar PII manualmente según rol del usuario |
| Anon | `src/lib/supabase/client.ts` | Componentes cliente. Respeta RLS automáticamente |

**Regla crítica**: Nunca importar el admin client en componentes React (`'use client'`).

---

## Componentes de Riesgo (No editar sin scope acotado)

| Componente | Tamaño | Problema |
|---|---|---|
| `src/components/Dashboard.tsx` | ~82KB | God component. Dividir en sub-componentes por sección antes de modificar |
| `src/components/SocialPublisherForm.tsx` | ~32KB | God component. Dividir por pasos del flujo |

---

## Build y Deploy

- **Build**: `npm run build` requiere `NODE_OPTIONS=--max-old-space-size=8192` (8GB heap)
- **Deploy**: Netlify auto-deploy en push a `main` (ver `netlify.toml`)
- **Remotion**: Video rendering via AWS Lambda (no en Netlify Functions, tiene timeout limit)
- **Scripts de operaciones**: ver `scripts/` y `docs/runbooks/`
