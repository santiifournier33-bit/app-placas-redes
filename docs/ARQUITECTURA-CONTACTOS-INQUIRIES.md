# Arquitectura: Contactos vs Inquiries — Freire Propiedades CRM

> **Estado:** IMPLEMENTADO (Sprint 1 — separación Contacto/Inquiry, jun 2026). Migración `add_contacts_kind_discriminator` aplicada + código en producción de lente/ingesta/promoción. Verificado: Contactos personal=0, leads=2648 en Consultas, paridad de matching idéntica, promoción E2E OK.
> **Audiencia:** desarrolladores y agentes/LLMs sin contexto previo.
> **Última verificación de datos:** proyecto Supabase `APP FREIRE FINAL` (`yahsfzmlijrolyvhxnhw`), junio 2026.

Si sos un LLM o dev nuevo, leé primero la sección **0 (TL;DR)** y la **6 (Reglas de negocio)**. Lo único innegociable: **una Inquiry NO es un Contacto.**

---

## 0. TL;DR (lo que nunca hay que mezclar)

- **Contacto** = persona de la **red personal** del usuario (referido, conocido, esfera de influencia, alta manual). Vive en `contacts` con `kind='personal'`. Se ve en el módulo **Contactos**.
- **Inquiry** = **evento de consulta**: alguien preguntó por una propiedad vía portal/web/Tokko. Vive en `inquiries`. Se ve en el módulo **Consultas**. Su identidad (nombre/email/tel) se guarda en `contacts` con `kind='lead'`.
- El módulo **Contactos** muestra **solo `kind='personal'`**. Los leads quedan ocultos ahí (solo aparecen en Consultas).
- El **Matching** y la **ingesta** leen `contacts` como **store de identidad** y **NUNCA filtran por `kind`**. Filtrar matching por `kind` rompe el sistema.

---

## 1. Resumen ejecutivo de la sección Contactos

El módulo **Contactos** (`/productividad/contactos`) es la **agenda de relaciones personales** del usuario dentro del CRM: la gente que el corredor decide conservar como parte de su red (referidos, conocidos, contactos estratégicos/influyentes/mentores, altas manuales o por CSV). Permite buscar, filtrar (origen/categoría/círculo), ver/editar ficha (datos, notas, tareas, historial), marcar "contactado" y disparar acciones rápidas (WhatsApp, llamar, email).

**Cómo funciona técnicamente:** un store Zustand (`src/lib/stores/contactStore.ts`) carga los contactos del usuario (`owner_id`) con paginación keyset (1000/página) y suscripción realtime. La UI tiene dos vistas: tabla virtualizada (desktop) y cards (móvil). Cada contacto puede tener emails/teléfonos múltiples (`contact_emails`/`contact_phones`), notas (`contact_notes`), historial (`contact_activity_log`), posición en pipeline (`contact_pipelines`) y tasaciones (`tasaciones`).

**Decisión arquitectónica central:** `contacts` es una **tabla única** que almacena la identidad de **todas** las personas (personales y leads). El módulo Contactos es un **lente** que filtra `kind='personal'`. Esto separa conceptualmente Contacto de Inquiry sin tocar el matching.

---

## 2. Arquitectura general

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Supabase (PostgreSQL + Auth + RLS) · Zustand · shadcn/ui · Tailwind 4 · Netlify.

**Capas relevantes:**
- **DB (Supabase Postgres):** tablas `contacts`, `contact_emails`, `contact_phones`, `contact_notes`, `contact_activity_log`, `contact_pipelines`, `inquiries`, `tasaciones`, `profiles`, `pipelines`, `pipeline_stages`.
- **Ingesta de leads:** webhook HMAC `POST /api/inquiries/inbound` → `src/lib/inquiries/inbound.ts` (`processInbound`). Enriquecimiento Zonaprop: `/api/inquiries/zonaprop-enrich`.
- **Matching:** `GET /api/consultas/matches?property_id=X` → `src/app/api/consultas/matches/route.ts`.
- **Identidad de consulta:** `GET /api/consultas/contact/[id]` (con enmascarado de PII por rol).
- **Estado cliente:** Zustand stores (`contactStore`, `pipelinesStore`, `taskStore`, etc.).
- **Auth:** sesión JWT httpOnly (jose) en rutas API (`getApiUser`); cliente anon (respeta RLS) en componentes; cliente service-role (bypassa RLS, enmascara PII en código) en rutas server.

---

## 3. Objetivo del CRM inmobiliario

Centralizar el ciclo comercial de la inmobiliaria en una sola app **mobile-first**: captar leads de portales (Zonaprop/Argenprop/Tokko/web) automáticamente, matchearlos con propiedades, dar al asesor una agenda de seguimiento (tareas/calendario), mover oportunidades por un pipeline de ventas, firmar documentos y registrar operaciones/comisiones. Reemplaza el trabajo disperso en planillas, mails y WhatsApp.

---

## 4. Objetivo del módulo de Contactos

Ser la **base de relaciones personal** del usuario. Solo debe contener:
1. Contactos personales. 2. Esfera de influencia. 3. Amigos. 4. Conocidos. 5. Referidos. 6. Altas manuales. 7. Relaciones que el usuario decide conservar como parte de su red.

**NO debe contener:** inquiries, consultas, leads capturados automáticamente, registros de scraping, consultas de portales, ni registros usados únicamente para matching.

---

## 5. Objetivo del módulo de Inquiries (Consultas)

Registrar y gestionar **cada consulta** de un interesado por una propiedad: qué propiedad, desde qué portal, cuándo, con qué preferencias, estado (pending/assigned/responded/archived) y quién respondió. Es el insumo del **Matching** y la bandeja de trabajo del asesor para responder leads. Vive en `inquiries` y se muestra en el módulo **Consultas**.

---

## 6. Objetivo del sistema de Matching

Dado una propiedad, encontrar los interesados (inquiries) más relevantes para ofrecérsela. `GET /api/consultas/matches?property_id=X`:
1. Filtra `inquiries` por tipo de operación y recencia (corte 18 meses).
2. Puntúa la afinidad propiedad↔consulta (atributos Tokko + snapshot).
3. Deduplica por `(contact_id, tokko_property_id)`.
4. Resuelve la **identidad** del interesado leyendo `contacts` (`.in('id', contactIds)`) + `contact_emails`/`contact_phones`.
5. Enmascara PII según rol (admin ve todo; asesor no-dueño ve solo nombre de pila).

**El matching usa `contacts` solo como store de identidad. No usa `kind`, `circulo`, `category`.**

---

## 7. Relación entre módulos (diagrama de FKs)

```
profiles (usuarios/agentes)
   │ owner_id
   ▼
contacts ──────────────┐  (kind: 'personal' | 'lead')
   ▲   ▲   ▲   ▲        │
   │   │   │   │        │ contact_id (NOT NULL)
   │   │   │   │        ▼
   │   │   │   │     inquiries ──► (Matching / módulo Consultas)
   │   │   │   │
   │   │   │   └── contact_pipelines ──► pipelines / pipeline_stages  (módulo Negocios/Kanban)
   │   │   └────── contact_notes
   │   └────────── contact_activity_log
   └────────────── contact_emails / contact_phones   (identidad para dedup + matching)
                   tasaciones (FK contact_id)
```

- **Acoplamiento duro:** `inquiries.contact_id` es **NOT NULL** → toda inquiry necesita un contacto. No se puede borrar un contacto con inquiries sin romper la FK/matching.
- **Lente Contactos:** `contacts WHERE kind='personal' AND owner_id=? AND deleted_at IS NULL`.
- **Lente Consultas/Matching:** `contacts` sin filtro de `kind`.

---

## 8. Reglas de negocio

1. **Una Inquiry NO es un Contacto.** Son entidades distintas con responsabilidades distintas.
2. El módulo **Contactos** muestra exclusivamente `kind='personal'`.
3. La **ingesta automática** (`processInbound` y cualquier webhook/scraper futuro) crea identidades con **`kind='lead'`**.
4. Las **altas manuales** (formulario `AddContactPanel`, import CSV) crean `kind='personal'`.
5. Los **leads** se ven y gestionan en **Consultas**, no en Contactos.
6. Un lead puede **promoverse** a contacto personal (acción explícita del usuario desde Consultas) → set `kind='personal'`. Es la única forma de que un lead aparezca en Contactos.
7. El **Matching, la dedup y la ingesta NUNCA filtran por `kind`** (leen toda la tabla de identidad).
8. Aislamiento por `owner_id` (RLS): cada asesor ve solo lo suyo; admin ve todo (con enmascarado de PII donde corresponde).

---

## 9. Decisiones arquitectónicas tomadas

| Decisión | Qué | Por qué |
|---|---|---|
| **Opción A — discriminador `kind`** | Columna `kind text NOT NULL DEFAULT 'personal' CHECK (kind IN ('personal','lead'))` en `contacts`. | Separa Contacto/Inquiry a nivel lógico sin mover datos ni tocar el matching. Bajo riesgo, reversible. Se descartó la "Opción B" (tabla separada + repuntar FK NOT NULL de 2630 filas) por alto riesgo sobre el matching. |
| **`contacts` = store de identidad único** | Tanto personales como leads guardan su identidad en `contacts`. | El matching y la dedup ya dependen de esta tabla; duplicar la identidad en otra tabla rompería esas queries. |
| **Leads ocultos de Contactos** | El módulo Contactos filtra `kind='personal'`; los leads solo se ven en Consultas. | Regla de negocio del usuario: Contactos = red personal pura. |
| **Promoción lead→personal** | Acción desde Consultas que setea `kind='personal'`. | Permite conservar como contacto personal a un lead con quien se generó relación. |
| **Backfill: todo lo existente → `lead`** | `UPDATE contacts SET kind='lead'`. | Los 2647 registros actuales son 100% lead-origin (0 curados, 0 personales). Contactos arranca limpio. |
| **Default `'personal'`** | Las nuevas filas son `'personal'` salvo que la ingesta setee `'lead'`. | Las altas de usuario son la vía "personal"; la ingesta es la única vía automática y setea `'lead'` explícito. |

**Evidencia que sustentó las decisiones (junio 2026):** 2647 contactos · 2630 (99.4%) con inquiry · 17 sin inquiry · 0 curados · 0 notas · 0 en pipeline · 0 tasaciones · sources: portal 2447 / tokko 192 / web 8 / manual 0.

---

## 10. Restricciones futuras (no romper)

- **Toda nueva ruta de ingesta** (webhook, scraper, importador automático) **DEBE** setear `kind='lead'`. Nunca dejar que cree `kind='personal'` por default.
- **El matching, la dedup de ingesta y el kanban de Negocios NUNCA deben filtrar `contacts` por `kind`.** Hay comentarios en el código marcándolo; respetarlos.
- No agregar una FK ni lógica que asuma "todo contacto es personal" o "todo contacto es lead".
- No borrar contactos con inquiries (FK NOT NULL). Usar soft-delete (`deleted_at`) y nunca purgar identidades referenciadas por inquiries.
- El módulo Contactos debe seguir siendo **mobile-first** (ver `AGENTS/mobile-first.md`).

---

## 11. Riesgos conocidos

- **Filtrar matching por `kind` por error** → leads dejan de matchear. Mitigación: comentarios explícitos + verificación de paridad de `/matches` antes/después de cualquier cambio.
- **Dashboard KPI de contactos** cae a ~0 tras el backfill (correcto: hoy no hay personales). Opcional: KPI separado de "Leads".
- **Kanban Negocios** usa su propio fetch (`kanbanContacts` vía `contact_pipelines`), no el array filtrado; si a futuro un lead entra a un pipeline, seguirá visible en el kanban aunque no en Contactos.
- **PII / service-role:** las rutas server usan cliente service-role (bypassa RLS) y enmascaran PII en código; omitir un guard expone datos. Mantener el enmascarado por rol.
- **Números de teléfono basura** en leads (sin validar) generan links `wa.me` rotos — se aborda en el sprint de robustez de datos (validación/normalización).

---

## 12. Estrategia de evolución

1. **Separación (este trabajo):** columna `kind`, backfill, lente Contactos, promoción desde Consultas, paridad de matching verificada.
2. **Robustez de datos:** validación/normalización de teléfono/email (Zod) en altas y en ingesta; unificar formato de error de API (`{error, code}`).
3. **Productividad comercial:** exponer salud del lead (`last_activity_at`), filtros por actividad, mejoras UX móviles del detalle (tabs/accordion), virtualización de cards.
4. **Gestión de base:** merge de duplicados, acciones masivas.
5. **A futuro (opcional):** si la red personal crece y la convivencia en una sola tabla molesta, evaluar migrar a tabla de identidades separada — pero solo con un plan de migración del matching probado.

---

## 13. Punteros de código (para empezar a leer)

| Tema | Archivo |
|---|---|
| Ingesta de leads (crea contacto+inquiry) | `src/lib/inquiries/inbound.ts` (`processInbound`) |
| Store de contactos (UI) | `src/lib/stores/contactStore.ts` |
| Lista Contactos | `src/app/(app)/productividad/contactos/page.tsx` |
| Ficha contacto | `src/app/(app)/productividad/contactos/[id]/page.tsx` |
| Matching | `src/app/api/consultas/matches/route.ts` |
| Identidad de consulta (PII) | `src/app/api/consultas/contact/[id]/route.ts` |
| Tipos DB | `src/lib/supabase/types.ts` |
| Reglas mobile-first | `AGENTS/mobile-first.md` |
