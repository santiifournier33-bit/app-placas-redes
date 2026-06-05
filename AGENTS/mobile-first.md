# Mobile-First Doctrine — app-placas-redes

> FUENTE ÚNICA Mobile-First. Gate NO-NEGOCIABLE. Aplica a UI de producto/CRM (tablas,
> formularios, navegación de app); NO a landing (eso es `skills/design-taste-frontend.md`).
> Toda tarea de UI pasa el checklist (§6) antes de marcarse "lista".

## 0. Principio rector
Asesores trabajan desde el teléfono, una mano, red variable. **Móvil = plataforma principal;
desktop = secundario.** Ante cualquier disyuntiva, gana lo que mejora el móvil. "Funciona en
desktop" no es criterio de aceptación.

## 1. Prioridad móvil
- Diseñar layout móvil PRIMERO; expandir a desktop (`base` → `md:` → `lg:`). Nunca al revés.
- Si no se usa cómodo en móvil, no está terminado.

## 2. UX (bajo esfuerzo cognitivo)
- Acción principal visible sin scroll, en zona del pulgar (mitad inferior).
- Flujos cortos (responder lead, crear tarea, ver propiedad = mínimos taps).
- Formularios largos → pasos o secciones colapsables, no muro de inputs.
- Predecible: misma acción, mismo lugar (usar BottomTabs / ContextualFAB).
- Estados siempre: loading (skeleton), vacío (cómo poblar), error (inline).

## 3. UI (táctil y legible)
- Touch targets ≥ 44×44px (`min-h-11`/`h-11`), separación ≥ 8px.
- Inputs body ≥ 16px (evita zoom iOS). Jerarquía por peso/tamaño, no solo color.
- Safe areas: `env(safe-area-inset-*)` en barras fijas.
- `min-h-[100dvh]`, NUNCA `h-screen` (salta con barra Safari iOS).
- Multi-columna: declarar colapso a 1 col en `< md` en el mismo componente.
- Tablas densas → en móvil = cards/lista, no scroll horizontal.
- Feedback táctil: `active:scale-[0.98]`. Modales pesados → bottom-sheet en móvil.
- `touch-action: manipulation` en interactivos (elimina delay de 300ms en tap).
- Neutralizar `-webkit-tap-highlight-color` y contener scroll con `overscroll-behavior: contain`.

## 4. Rendimiento (red móvil)
- Listas largas (leads/contactos/propiedades) → paginar/virtualizar.
- `next/image` con `sizes`; lazy default, `priority` solo hero.
- Preferir Server Components / SWR sobre `useEffect`-fetch. No traer datos no mostrados.
- Animar solo `transform`/`opacity`. Respetar `prefers-reduced-motion`. Lazy-load no-crítico.
- CWV móvil: LCP < 2.5s, INP < 200ms, CLS < 0.1.

## 5. PWA
- Verificar como app instalada (standalone), no solo pestaña.
- sw.js: cachear shell; degradar offline con gracia. SW debe IGNORAR cross-origin (lección Tokko).
- Escrituras: feedback optimista + reintento ante red intermitente cuando aplique.

## 6. Checklist OBLIGATORIO antes de "listo"
- [ ] ¿Mobile-first (base→md→lg), no desktop-achicado?
- [ ] ¿Acción principal alcanzable con el pulgar sin scroll?
- [ ] ¿Touch targets ≥ 44px, separación ≥ 8px?
- [ ] ¿Colapso a 1 col declarado para `< md`?
- [ ] ¿Tablas densas → cards/lista en móvil?
- [ ] ¿`min-h-[100dvh]` (no `h-screen`) y safe-areas?
- [ ] ¿Estados loading/vacío/error?
- [ ] ¿Listas largas paginadas/virtualizadas? ¿payload mínimo?
- [ ] ¿`prefers-reduced-motion`; solo transform/opacity?
- [ ] ¿Probado en viewport móvil (Chrome DevTools MCP `emulate` + `lighthouse_audit`)?
- [ ] ¿Dark mode sigue funcionando en móvil?
