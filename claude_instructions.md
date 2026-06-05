# Instrucciones para Claude Code: Rediseño UI/UX Móvil y Desktop de `app-placas-redes`

Vas a actuar como un experto en UI/UX Frontend siguiendo el playbook de **`redesign-existing-projects`** (Taste-Skill, ubicado en `AGENTS/skills/design-taste-frontend.md`). Tu objetivo es auditar y rediseñar la interfaz de la aplicación interna de gestión inmobiliaria `app-placas-redes` (ubicada en este repositorio).

---

## 1. Contexto del Proyecto
- **Tecnologías**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion.
- **Función**: Herramienta interna para asesores inmobiliarios de **Freire Propiedades**. Permite generar descripciones con IA, PDFs, videos promocionales, publicar en redes y gestionar pipelines de contactos/negocios.
- **Enfoque de Rediseño**: Debe ser intuitivo, minimalista, estético y premium. Debe contar con soporte completo tanto para modo claro como oscuro.

---

## 2. Reglas Estrictas de Modificación
1. **Preservar Lógica**: No toques la lógica de negocio, hooks de React, llamadas a APIs (`/api/*`), consultas a Supabase, ni el estado global (`stores`). Céntrate exclusivamente en el marcado (HTML/JSX), Tailwind CSS, Framer Motion y componentes visuales.
2. **Referencia de Marca**:
   - Inspirado en la web principal: [www.freirepropiedades.com](https://www.freirepropiedades.com).
   - Logos de la marca: usar logo azul para el modo claro y logo blanco para el modo oscuro.
3. **Foco Mobile-First**: Los asesores inmobiliarios usarán la herramienta principalmente desde sus celulares en la calle. Toda la interfaz debe ser 100% responsiva, con especial detalle en:
   - Formularios limpios, inputs cómodos y layouts colapsables en móvil.
   - Navegación móvil intuitiva (ej. barra inferior o menú hamburguesa optimizado).

---

## 3. Proceso de Trabajo Paso a Paso

### Paso 1: Auditoría de Diseño (Scan & Diagnose)
Antes de modificar cualquier archivo, **leé `AGENTS/mobile-first.md` y auditá el diseño actual contra su checklist** (no solo estética: touch targets, colapso `< md`, tablas→cards, `100dvh`, safe-areas, estados, performance móvil). Luego realiza una auditoría completa del diseño actual de `app-placas-redes`. Identifica y reporta:
- Debilidades en el layout responsivo actual (PC vs Móvil).
- Problemas de espaciado, alineación y consistencia visual.
- Calidad de la tipografía y jerarquía visual.
- Manejo actual de colores y superficies (especialmente para la dualidad Claro/Oscuro).
- Estados faltantes de UI (carga, error, vacío).

### Paso 2: Interacción y Preguntas
Presenta el reporte de la auditoría y hazme las preguntas necesarias para aclarar decisiones de diseño (colores exactos, flujos móviles específicos, etc.) antes de continuar. **Espera mi confirmación.**

### Paso 3: Planificación
Una vez respondidas las preguntas, redacta un plan de implementación detallado que divida los cambios por componentes o páginas principales (ej. Login, Dashboard, Tablas, Modales de Oportunidad y Contactos).

### Paso 4: Implementación
Con el plan aprobado, implementa los cambios visuales de forma incremental y limpia, verificando constantemente que la aplicación compile sin errores.
