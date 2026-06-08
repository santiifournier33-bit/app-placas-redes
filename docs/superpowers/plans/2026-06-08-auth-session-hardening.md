# Robustecer Autenticación (sesión Supabase + cookie jose) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar los falsos "sesión expirada"/empty-states intermitentes dejando al navegador como único renovador de la sesión Supabase y renovando la cookie jose de forma deslizante, sin tocar realtime ni las ~145 lecturas RLS del cliente.

**Architecture:** La app mantiene 2 sesiones a propósito (cookie jose = gate de páginas; sesión Supabase = datos+realtime en el cliente). Hoy el proxy server y el navegador renuevan ambos el refresh-token rotatorio de Supabase → carrera → `SIGNED_OUT` intermitente. Quitamos el refresh del proxy (nada server-side consume esa sesión: `profile.ts` es código muerto) y agregamos renovación deslizante de jose en el proxy. Diseño y contexto completos en `docs/superpowers/specs/2026-06-08-auth-session-hardening-design.md`.

**Tech Stack:** Next.js 16 (proxy/middleware), `@supabase/ssr` 0.10.3, `jose` 6 (HS256), TypeScript strict. Sin framework de tests → verificación vía `npx tsx` (helper puro), `tsc --noEmit`, `npm run build`, browser (Chrome DevTools MCP, sesión dev logueada) y logs auth (Supabase MCP).

---

## File Structure

- `src/lib/auth/session-renewal.ts` — **Crear.** Predicado puro `shouldRenewSession(expSeconds, maxAgeSeconds, nowSeconds)`. Sin imports de `next/*` → seguro para el edge/proxy y testeable de forma aislada.
- `scripts/test-session-renewal.ts` — **Crear.** Verificación del predicado (corre con `npx tsx`).
- `src/lib/auth/session.ts` — **Modificar.** Agregar claim `maxAge` al JWT (`encrypt`) y exponerlo en `decrypt`/`SessionPayload`.
- `src/proxy.ts` — **Modificar.** Quitar el bloque de refresh de Supabase (Cambio 1) + renovación deslizante de jose usando el helper puro (Cambio 2).
- `src/lib/auth/profile.ts` — **Eliminar.** Código muerto (sin llamadores); su existencia bloquea el supuesto del Cambio 1.

> `src/app/api/auth/route.ts` NO se toca: ya llama `encrypt({...}, maxAgeSeconds)`, y tras el cambio de `encrypt` el claim `maxAge` queda embebido automáticamente.

---

### Task 1: Claim `maxAge` en el JWT jose

**Files:**
- Modify: `src/lib/auth/session.ts`

- [ ] **Step 1: Agregar `maxAge` a `SessionPayload` y embeberlo en `encrypt`**

En `src/lib/auth/session.ts`, reemplazar la interfaz y la función `encrypt` por:

```ts
export interface SessionPayload {
  email: string
  role: UserRole
  expiresAt: Date
  /** Ventana original en segundos (7 o 30 días). Permite renovar con el plazo correcto. */
  maxAge: number
}

export async function encrypt(
  payload: { email: string; role: UserRole; expiresAt: Date },
  maxAgeSeconds: number = SESSION_MAX_AGE_DEFAULT,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    expiresAt: payload.expiresAt.toISOString(),
    maxAge: maxAgeSeconds,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(encodedKey)
}
```

(El input de `encrypt` es `{ email, role, expiresAt }` — sin `maxAge` — para no romper a `createSession`; el claim `maxAge` se deriva del parámetro `maxAgeSeconds`.)

- [ ] **Step 2: Exponer `maxAge` en `decrypt`**

Reemplazar el `return` dentro de `decrypt`:

```ts
    return {
      email: payload.email as string,
      role: payload.role as UserRole,
      expiresAt: new Date(payload.expiresAt as string),
      maxAge: (payload.maxAge as number) ?? SESSION_MAX_AGE_DEFAULT,
    }
```

(Tokens viejos sin `maxAge` caen al default de 7 días — backward-compatible.)

- [ ] **Step 3: Verificar tipos**

Run: `cd app-placas-redes && npx tsc --noEmit`
Expected: exit 0, sin errores. (`createSession` sigue compilando: llama `encrypt({ email, role, expiresAt })` con `maxAgeSeconds` default.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/session.ts
git commit -m "feat(auth): embeber claim maxAge en el JWT de sesion jose"
```

---

### Task 2: Predicado puro de renovación + verificación

**Files:**
- Create: `src/lib/auth/session-renewal.ts`
- Create: `scripts/test-session-renewal.ts`

- [ ] **Step 1: Escribir la verificación que falla**

Crear `scripts/test-session-renewal.ts`:

```ts
import assert from 'node:assert/strict'
import { shouldRenewSession } from '../src/lib/auth/session-renewal'

const WEEK = 7 * 24 * 60 * 60
const now = 1_000_000

// Recién emitido (queda toda la ventana) → NO renovar.
assert.equal(shouldRenewSession(now + WEEK, WEEK, now), false)

// Justo en el 50% restante → NO renovar (umbral estricto).
assert.equal(shouldRenewSession(now + WEEK / 2, WEEK, now), false)

// Menos del 50% restante → renovar.
assert.equal(shouldRenewSession(now + WEEK / 2 - 1, WEEK, now), true)

// Casi vencido → renovar.
assert.equal(shouldRenewSession(now + 60, WEEK, now), true)

// Ya vencido → NO renovar (que el proxy lo mande a /login).
assert.equal(shouldRenewSession(now - 1, WEEK, now), false)

console.log('session-renewal: OK')
```

- [ ] **Step 2: Correr la verificación y confirmar que falla**

Run: `cd app-placas-redes && npx tsx scripts/test-session-renewal.ts`
Expected: FALLA con error de módulo no encontrado (`Cannot find module '../src/lib/auth/session-renewal'`).

- [ ] **Step 3: Implementar el helper puro**

Crear `src/lib/auth/session-renewal.ts`:

```ts
/**
 * ¿Hay que renovar la cookie de sesión jose (sliding renewal)?
 * Verdadero cuando queda menos de la mitad de la ventana original y el token
 * todavía no venció. Pura: sin imports de next/* → segura para el proxy/edge.
 *
 * @param expSeconds    exp del JWT (segundos epoch).
 * @param maxAgeSeconds ventana original (claim `maxAge`).
 * @param nowSeconds    ahora en segundos epoch.
 */
export function shouldRenewSession(
  expSeconds: number,
  maxAgeSeconds: number,
  nowSeconds: number,
): boolean {
  const remaining = expSeconds - nowSeconds
  return remaining > 0 && remaining < maxAgeSeconds / 2
}
```

- [ ] **Step 4: Correr la verificación y confirmar que pasa**

Run: `cd app-placas-redes && npx tsx scripts/test-session-renewal.ts`
Expected: imprime `session-renewal: OK`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/session-renewal.ts scripts/test-session-renewal.ts
git commit -m "feat(auth): predicado puro shouldRenewSession + verificacion"
```

---

### Task 3: Cambio 1 — quitar el refresh de Supabase del proxy

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Quitar el import de `createServerClient`**

En `src/proxy.ts`, borrar la línea:

```ts
import { createServerClient } from '@supabase/ssr'
```

- [ ] **Step 2: Quitar el bloque de refresh de Supabase y el `response` previo**

Borrar desde `let response = NextResponse.next({ request })` hasta el cierre del `if (process.env.NEXT_PUBLIC_SUPABASE_URL ...)` inclusive (todo el bloque que crea el `createServerClient` y llama `await supabase.auth.getClaims()`).

El cuerpo de `proxy()` debe quedar (tras los early-returns de PUBLIC_PATHS y `/api/`):

```ts
  // App session JWT check
  const session = request.cookies.get('session')?.value
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })

    const role = payload.role as string

    if (ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p)) && role !== 'admin') {
      return NextResponse.redirect(new URL('/diseno', request.url))
    }

    return NextResponse.next({ request })
  } catch {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    redirectResponse.cookies.delete('session')
    return redirectResponse
  }
```

(La renovación deslizante se agrega en la Task 4; por ahora solo se elimina el refresh de Supabase.)

- [ ] **Step 3: Verificar tipos y build**

Run: `cd app-placas-redes && npx tsc --noEmit`
Expected: exit 0.

Run: `cd app-placas-redes && NODE_OPTIONS=--max-old-space-size=8192 npm run build`
Expected: build exitoso (imprime el árbol de rutas, sin errores).

- [ ] **Step 4: Verificación en browser (regresión + realtime)**

Con el dev server en `:3000` y sesión logueada (Chrome DevTools MCP):
- Navegar a `http://localhost:3000/productividad/negocios` → cargan los 4 pipelines + leads (sin "Reintentar", sin skeleton colgado).
- Navegar a `http://localhost:3000/productividad/tareas` → carga, **sin** toast "Tu sesión expiró".
- **Realtime:** en Tareas, crear una tarea (botón "Añadir tarea") → aparece sin recargar. (Confirma que el navegador mantiene la sesión Supabase viva sin el refresh del proxy.)
- Consola sin errores nuevos de auth (ignorar ruido `react-grab`/CSP de dev).

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts
git commit -m "fix(auth): proxy deja de refrescar Supabase (navegador = unico renovador, mata la carrera)"
```

---

### Task 4: Cambio 2 — renovación deslizante de la cookie jose en el proxy

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Importar `SignJWT` y el helper; definir constantes locales**

En `src/proxy.ts`, ajustar el import de `jose` y agregar el helper + constante (el proxy no puede importar `session.ts` porque es `server-only`/`next/headers`; se replican secret y ventana default, idénticos a `session.ts`):

```ts
import { SignJWT, jwtVerify } from 'jose'
import { shouldRenewSession } from '@/lib/auth/session-renewal'

const secretKey = process.env.SESSION_SECRET || 'freire-propiedades-secret-key-change-in-prod'
const encodedKey = new TextEncoder().encode(secretKey)
const SESSION_MAX_AGE_DEFAULT = 7 * 24 * 60 * 60 // espejo de session.ts; fallback para tokens sin claim maxAge
```

(La línea `const secretKey`/`encodedKey` ya existe — no duplicarla; solo agregar `SignJWT` al import, el import del helper y la constante `SESSION_MAX_AGE_DEFAULT`.)

- [ ] **Step 2: Renovar dentro del `try`, antes de devolver la respuesta**

Reemplazar el `return NextResponse.next({ request })` del bloque exitoso (el del Step 2 de la Task 3) por:

```ts
    const response = NextResponse.next({ request })

    // Renovación deslizante: si queda menos de la mitad de la ventana, re-firmar
    // una jose nueva con exp extendido (claims idénticos a session.ts).
    const exp = payload.exp as number | undefined
    const maxAge = (payload.maxAge as number) || SESSION_MAX_AGE_DEFAULT
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (exp && shouldRenewSession(exp, maxAge, nowSeconds)) {
      const newExpiresAt = new Date(Date.now() + maxAge * 1000)
      const renewed = await new SignJWT({
        email: payload.email as string,
        role: payload.role as string,
        expiresAt: newExpiresAt.toISOString(),
        maxAge,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${maxAge}s`)
        .sign(encodedKey)

      response.cookies.set('session', renewed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: newExpiresAt,
        sameSite: 'lax',
        path: '/',
      })
    }

    return response
```

- [ ] **Step 3: Verificar tipos y build**

Run: `cd app-placas-redes && npx tsc --noEmit`
Expected: exit 0.

Run: `cd app-placas-redes && NODE_OPTIONS=--max-old-space-size=8192 npm run build`
Expected: build exitoso.

- [ ] **Step 4: Verificar la renovación con cookie inyectada (browser)**

No se puede esperar 3.5 días, así que se inyecta una jose cercana al umbral y se confirma que el proxy la renueva:

1. Generar un token con `exp` a ~1 día (< 50% de 7 días) usando el secret de dev. Crear `scripts/sign-near-expiry.ts`:

```ts
import { SignJWT } from 'jose'
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'freire-propiedades-secret-key-change-in-prod')
const WEEK = 7 * 24 * 60 * 60
const oneDay = 24 * 60 * 60
const expiresAt = new Date(Date.now() + oneDay * 1000)
const token = await new SignJWT({
  email: 'freirepropiedadespilar@gmail.com',
  role: 'admin',
  expiresAt: expiresAt.toISOString(),
  maxAge: WEEK,
})
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime(`${oneDay}s`)
  .sign(secret)
console.log(token)
```

Run: `cd app-placas-redes && npx tsx scripts/sign-near-expiry.ts`
Expected: imprime un JWT.

2. En el browser (Chrome DevTools MCP) setear esa cookie `session` para `localhost` y navegar a `/dashboard`. Leer el `Set-Cookie` de la respuesta del proxy (o re-decodificar la cookie `session` resultante) y confirmar que el nuevo `exp` ≈ ahora + 7 días (renovó), no ~1 día.
   - Decodificar el `exp` con: `npx tsx -e "const t=process.argv[1].split('.')[1]; console.log(JSON.parse(Buffer.from(t,'base64url')).exp)" <TOKEN>` antes y después.
   - Criterio: `exp_después - exp_antes` ≈ 6 días (la cookie saltó de +1d a +7d).

3. (Cleanup) borrar `scripts/sign-near-expiry.ts` antes del commit final, o dejarlo como utilidad de dev — default: borrarlo.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(auth): renovacion deslizante de la cookie jose en el proxy"
```

---

### Task 5: Eliminar `profile.ts` (código muerto)

**Files:**
- Delete: `src/lib/auth/profile.ts`

- [ ] **Step 1: Confirmar que no tiene llamadores**

Run: `cd app-placas-redes && git grep -n "getProfile\|getProfileId\|auth/profile" -- 'src' ':!src/lib/auth/profile.ts'`
Expected: sin resultados (cero llamadores).

- [ ] **Step 2: Eliminar el archivo**

Run: `cd app-placas-redes && git rm src/lib/auth/profile.ts`

- [ ] **Step 3: Verificar build**

Run: `cd app-placas-redes && npx tsc --noEmit && NODE_OPTIONS=--max-old-space-size=8192 npm run build`
Expected: exit 0 / build exitoso (nada importaba el archivo).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(auth): eliminar profile.ts (codigo muerto, server no usa sesion Supabase de usuario)"
```

---

### Task 6: Verificación final + deploy (gated por el usuario)

- [ ] **Step 1: Verificación end-to-end en browser**

- Login fresco OK; Negocios (pipelines+leads), Tareas, Calendario y Contactos cargan; realtime actualiza en vivo.
- Sin toast falso "sesión expiró" ni "Reintentar" con sesión válida.
- Recorrer reloads (3x) en Negocios → board estable, sin parpadeo.

- [ ] **Step 2: Logs de auth (Supabase MCP)**

Usar `get_logs(service: "auth")` del proyecto `APP FREIRE FINAL` (`yahsfzmlijrolyvhxnhw`) tras un rato de uso → confirmar ausencia de ráfagas de `invalid refresh token` / `refresh_token_not_found` (señal de que la carrera desapareció).

- [ ] **Step 3: Deploy a producción (solo con OK del usuario)**

Solo cuando el usuario lo apruebe (regla del proyecto: commitear/deployar a pedido):

```bash
cd app-placas-redes && git push origin main
npx netlify watch
```

Expected: Netlify "Deploy complete" en proyecto `app-interna-freire` (https://ficha.qzz.io). Smoke check: `curl -s -o /dev/null -w "%{http_code}" https://ficha.qzz.io/login` → 200.

---

## Notas de ejecución
- **Sin framework de tests** en el repo: la única "prueba unitaria" es `scripts/test-session-renewal.ts` (helper puro). El resto se valida con tsc + build + browser + logs.
- **`@/` en el proxy:** el proxy corre en el bundle de Next con el alias `@/` resuelto (es código de app, no una Netlify function). `shouldRenewSession` es puro → importable sin problemas.
- **Secret compartido:** `proxy.ts` y `session.ts` deben usar el MISMO `SESSION_SECRET` y alg `HS256`. Ya es el caso; no cambiar.
