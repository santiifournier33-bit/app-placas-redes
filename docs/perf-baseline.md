# Performance Baseline — app-placas-redes

> Medición inicial **antes** de optimizaciones. Fecha: 2026-06-02.
> Stack: Next.js 16.2 (Turbopack) · React 19.2 · Supabase · Remotion.
> Re-medir tras cada fase y comparar en `docs/perf-after.md`.

## Cómo se midió

| Qué | Comando / herramienta |
|---|---|
| Bundle (treemap interactivo) | `npm run analyze` → abre el visor en `.next/diagnostics/analyze/index.html` (analizador nativo de Turbopack, flag `--experimental-analyze`) |
| Tamaño real de chunks | `find .next/static/chunks -name "*.js"` sobre el build de producción |
| Core Web Vitals (rutas protegidas) | MCP `chrome-devtools` → `lighthouse_audit` + `performance_start_trace` desde un navegador logueado |
| CWV (rutas públicas) | `npm run lhci` (Lighthouse CI sobre `/login`) |
| Re-renders | `npm run scan` (React Scan toolbar) en dev |
| Memory | MCP `chrome-devtools` → `take_heapsnapshot` |

> Nota Next 16: `next build` usa **Turbopack** por defecto, así que la tabla del build ya **no imprime** columnas Size / First Load JS, y `@next/bundle-analyzer` (webpack) es un no-op. Por eso usamos el analizador nativo `--experimental-analyze` y la medición directa de `.next/static/chunks`.

## Baseline de bundle (build producción)

- **Total `.next/static/chunks`: ~10 MB**

Chunks más pesados (objetivos de code-split):

| Tamaño | Probable contenido |
|---|---|
| **1713 KB** | vendor principal (framer-motion + radix + supabase + …) |
| **968 KB** | segundo vendor / Remotion player |
| **674 KB** ×3 | @react-pdf/renderer + Remotion + relacionados |
| **445 KB** | — |
| **359 KB** | — |
| **331 KB** ×2 | — |
| **303 KB** | — |

> Tras los pasos de lazy-loading (Q2/S3) estos chunks de 674 KB+ deberían dejar de cargarse en el First Load de rutas que no usan PDF/video.

Rutas con más peso de datos en el analizador (mayor superficie de código): `servicios`, `productividad`, `consultas`, `diseno`.

## Core Web Vitals (captura en vivo, MCP chrome-devtools)

> ⚠️ Medido sobre `npm run dev` (Turbopack, sin minificar, compilación on-demand).
> Los tiempos (LCP/render delay) están **inflados vs producción**; sirven como
> dirección, no como número absoluto. **CLS sí es representativo** (inestabilidad
> de layout persiste en prod). Re-medir en build de prod para baseline final.

| Ruta | LCP | TTFB | CLS | Notas |
|---|---|---|---|---|
| /login (logout) | 1006 ms | 33 ms | 0.00 | render delay 949ms = compilación dev. a11y 94 / BP 92 / SEO 92 |
| /dashboard (ADMIN) | 758 ms | 341 ms | **0.18 ⚠️** | CLS malo: cluster @943ms (score 0.155) |

Objetivos: Perf ≥ 0.8 · LCP < 2.5s · TBT < 300ms · CLS < 0.1.

### Hallazgo accionable — CLS 0.18 en /dashboard
Layout shift grande (~943ms) al poblarse las secciones que cargan datos por
fetch client-side (stat cards, anillos de embudo, ranking) + banner de push.
**Fix:** reservar altura / skeletons en esas secciones para que no reflowen al
llegar los datos. Verificable en vivo re-midiendo CLS.

## Re-renders (React Scan) — pendiente

Interactuar logueado y anotar componentes con cascada de renders:

- [ ] `productividad/tareas` — editar tarea
- [ ] `productividad/negocios` — mover card kanban
- [ ] `productividad/contactos` — `ContactsTable` (17 columnas, sin virtualización)
- [ ] `consultas/[id]` — lista de matches

## Memory (heapsnapshot) — pendiente

- [ ] Navegar 10× entre módulos; comparar snapshots. Sospechosos: listeners realtime de `contactStore`/`taskStore` no liberados en unmount.

## Tooling instalado en este paso

- `react-scan` (dev-only) → `src/components/dev/ReactScan.tsx`, montado en `src/app/layout.tsx` solo si `NODE_ENV=development`.
- `@lhci/cli` → `lighthouserc.js` (raíz).
- `next.config.ts`: `experimental.optimizePackageImports` (lucide/iconsax/recharts/date-fns/framer-motion) + `images.formats` AVIF/WebP.
- Scripts: `npm run analyze` · `npm run scan` · `npm run lhci`.
