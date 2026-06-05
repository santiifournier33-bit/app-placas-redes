# app-placas-redes

CRM interno de **Freire Propiedades** — PWA **Mobile-First** para asesores inmobiliarios.
Gestión de leads, tareas, email, pipeline de ventas, social publishing, documentos y firmas.

> Contexto del agente: ver `CLAUDE.md`. Doctrina de UI: `AGENTS/mobile-first.md` (gate duro).
> Arquitectura completa: `docs/architecture.md`.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Supabase (PostgreSQL + Auth + RLS)
· Zustand · shadcn/ui · Tailwind 4.

## Desarrollo

```bash
npm run dev      # servidor de desarrollo (http://localhost:3000)
npm run build    # build de producción (requiere NODE_OPTIONS=--max-old-space-size=8192)
npm test         # tests (Vitest)
npm run lint     # ESLint
```

Variables de entorno: ver `.env.local.example`.

## Deploy
**Netlify** — auto-deploy en push a `main`. Configuración en `netlify.toml`.
Video rendering (Remotion) corre en AWS Lambda, no en Netlify Functions (timeout limit).
