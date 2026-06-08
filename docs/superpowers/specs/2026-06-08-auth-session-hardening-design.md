# Diseño — Robustecer autenticación (sesión Supabase + cookie jose)

Fecha: 2026-06-08
Estado: aprobado (Enfoque A, Cambios 1 + 2; Cambio 3 descartado por YAGNI)

## Context

La app corre **dos sesiones en paralelo, a propósito**:
- **Cookie jose `session`** (`src/lib/auth/session.ts`): "¿estoy logueado?". Gatea páginas (proxy + layouts server). Dura 7 días (30 con "recordar"), **expiración fija, nunca se renueva**.
- **Sesión Supabase Auth** (cookies `sb-*`, `@supabase/ssr` 0.10.3): permisos de datos (RLS) + **realtime** en el cliente. Access token corto (~1h) + refresh token **rotatorio (un solo uso)**.

La capa jose se agregó deliberadamente para desacoplar el gate de páginas del token corto de Supabase (ver comentario en `src/lib/auth/api-auth.ts:14-20`).

**Problema (causa raíz):** la sesión Supabase se desincroniza/cae mientras la cookie jose sigue válida → el cliente ve `user: null` → falso "Tu sesión expiró" (toast en Tareas) y "No hay procesos comerciales" en Negocios. Dos detonantes:
1. **Carrera de refresh:** el proxy (`src/proxy.ts:54`, `getClaims()`) y el navegador (auto-refresh de supabase-js) renuevan **ambos** el refresh-token rotatorio. Al ser de un solo uso, el segundo en usarlo falla → `SIGNED_OUT` intermitente.
2. **jose sin renovación:** vence a plazo fijo; un usuario activo puede toparse con el vencimiento.

Un fix previo (ya deployado, commit `5825bda`) cortó el sangrado en el cliente: helper `getActiveUser()` (reintenta `refreshSession()` 1 vez), UI de error+Reintentar separada del vacío-real, y **eliminación del reseed destructivo** en `pipelinesStore`. Este diseño ataca la **causa raíz** del lado sesión.

### Restricción de arquitectura (descubierta en exploración)
- 4 stores (`pipelinesStore`, `taskStore`, `contactStore`, `calendarStore`) usan **realtime** (`.channel().subscribe()`) → el cliente **necesita** sesión Supabase viva. No se puede mover todo a API routes sin matar realtime → se descarta el enfoque "lecturas vía getApiUser" y "unificar en una sola sesión".
- **Nada server-side consume la sesión Supabase del usuario**: `src/lib/auth/profile.ts` (`getProfile`/`getProfileId`) es **código muerto** (sin llamadores); API routes usan service-role + `getApiUser`; layouts usan jose `getSession()`. → El navegador puede ser el **único renovador** sin romper nada.

## Goal

Eliminar los falsos "sesión expirada" / empty-states intermitentes, conservando intactos realtime y las ~145 lecturas RLS del cliente. Cambio acotado a la capa de sesión.

## Diseño

### Cambio 1 — Un solo renovador de la sesión Supabase
**Qué:** quitar de `src/proxy.ts` el bloque `createServerClient` + `await supabase.auth.getClaims()`. El proxy conserva solo: verificar la cookie jose (`jwtVerify`), gatear `ADMIN_ONLY_PATHS` por rol, y redirigir a `/login` si falta/es inválida.

**Por qué:** deja al **navegador como único renovador**. `@supabase/ssr`/supabase-js ya trae auto-refresh por timer **y** recuperación al volver a la pestaña (`GoTrueClient._handleVisibilityChange` cuando `autoRefreshToken` está activo, que es el default). Al no competir el proxy por el refresh-token rotatorio, desaparece la carrera del detonante #1.

**Seguro porque:** ningún consumidor server-side de la sesión usuario (profile.ts muerto; API routes service-role+jose; layouts jose). 

**Limpieza asociada:** eliminar `src/lib/auth/profile.ts` (código muerto) o, si se prefiere conservarlo, documentar que no se usa. Default: eliminarlo.

### Cambio 2 — Renovación deslizante de la cookie jose
**Qué:** en `src/proxy.ts`, tras verificar la jose con éxito, si la vida restante del token es menor a un umbral, re-firmar una jose nueva (mismo `email`/`role`, `exp` extendido) y setearla en `response.cookies`.

**Detalles:**
- **Umbral de renovación:** renovar cuando reste menos del 50% de la ventana original. Evita re-firmar en cada request (barato pero innecesario) y garantiza que un usuario activo nunca vea el vencimiento.
- **Preservar la ventana (7 vs 30 días):** hoy el token no recuerda si el login fue con "recordar". Agregar un claim `maxAge` (segundos) al firmar:
  - `src/lib/auth/session.ts`: extender `SessionPayload` con `maxAge: number`; `encrypt()` lo incluye; `createSession()`/login lo setean (`SESSION_MAX_AGE_DEFAULT` o `SESSION_MAX_AGE_REMEMBER`).
  - `src/app/api/auth/route.ts`: ya calcula `maxAgeSeconds`; pasarlo al payload.
  - El proxy usa `maxAge` del payload para calcular el nuevo `exp` y el `expires` de la cookie. Tokens viejos sin `maxAge` → fallback `SESSION_MAX_AGE_DEFAULT`.
- **Firma en el proxy:** el proxy ya importa `jwtVerify` de `jose`; agregar `SignJWT` con el mismo `secretKey`/alg `HS256`. (No se puede reusar `session.ts` directamente: es `server-only` y escribe cookies vía `next/headers`; el proxy setea en `response.cookies`.) Mantener `secretKey`, alg y claims idénticos a `session.ts` para compatibilidad.
- **Cookie:** mismas opciones que el login (`httpOnly`, `secure` en prod, `sameSite:'lax'`, `path:'/'`).

## Fuera de alcance (explícito)
- **Cambio 3** (provider on-focus para re-login UX): descartado por YAGNI — supabase-js ya recupera al volver a la pestaña; `getActiveUser` cubre el gate 401.
- **Unificar en una sola sesión** / mover lecturas a API routes: descartado (rompería realtime; pelea el desacople deliberado).
- Las ~145 lecturas RLS del cliente, endpoints y realtime: no se tocan.
- Remediación de secretos (tarea aparte del usuario).

## Manejo de errores / borde
- Si el refresh de Supabase falla de verdad (refresh token vencido/revocado) → `getActiveUser` devuelve `refreshFailed` → UX terminal ya existente (toast en Tareas / "Reintentar" en Negocios). Correcto.
- Token jose corrupto/expirado en proxy → redirige a `/login` y borra la cookie (comportamiento actual, se mantiene).
- Renovación jose: si re-firmar fallara, no bloquear la request (el token actual aún es válido); seguir sirviendo.

## Verificación
1. **No-regresión:** login OK; Negocios carga pipelines; Tareas carga; **realtime** sigue actualizando en vivo (crear tarea/mover lead refleja sin recargar).
2. **Carrera eliminada:** tab idle más allá del vencimiento del access token (~1h) → interactuar → sin logout falso (refresh del navegador recupera). Logs auth Supabase (MCP `get_logs(service:auth)`) sin ráfagas de "invalid refresh token" tras el deploy.
3. **jose deslizante:** navegar con una cookie jose cercana al umbral → confirmar que el `exp`/`expires` de la cookie `session` avanza (inspeccionar Set-Cookie en Network o decodificar el JWT).
4. **Gates:** build (`NODE_OPTIONS=--max-old-space-size=8192 npm run build`) + `tsc --noEmit` + eslint de archivos tocados, todos limpios.

## Riesgos
- Quitar el refresh del proxy asume cero consumidores server-side de la sesión usuario (verificado: profile.ts muerto). Si a futuro un server component necesitara la sesión usuario, deberá refrescar explícitamente.
- Re-firmar jose en el proxy duplica lógica de `session.ts` (secret/alg/claims). Mitigación: comentar la dependencia y mantener constantes idénticas; cubrir con la verificación #3.

## Archivos afectados
- `src/proxy.ts` — quitar refresh Supabase (Cambio 1) + renovación deslizante jose (Cambio 2).
- `src/lib/auth/session.ts` — claim `maxAge` en `SessionPayload`/`encrypt`/`createSession`.
- `src/app/api/auth/route.ts` — pasar `maxAge` al payload del login.
- `src/lib/auth/profile.ts` — eliminar (código muerto).
