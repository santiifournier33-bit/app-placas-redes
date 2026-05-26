/**
 * Default pipeline & stage definitions for Freire Propiedades.
 *
 * Methodology: Método Freire — each pipeline covers a real-estate
 * commercial cycle with reduced, actionable stages.
 *
 * ⚠️  Bump PIPELINE_SEED_VERSION whenever you change the definitions below.
 *     init() uses this to auto-replace outdated pipelines on every login.
 */

/**
 * Version tag — bump this to force a re-seed for all users on next login.
 * The version is stored per-user in Supabase (pipeline name prefix check)
 * and also in localStorage as a fast-path.
 */
export const PIPELINE_SEED_VERSION = 3

export interface StageSeed {
  name: string
  emoji: string
  color: string
  position: number
  sla_days?: number
}

export interface PipelineSeed {
  name: string
  emoji: string
  position: number
  stages: StageSeed[]
}

export const DEFAULT_PIPELINES: PipelineSeed[] = [
  /* ───────────────────────── 1. Venta (Captación de Propiedades) ───────────────────────── */
  {
    name: 'Venta (Captación)',
    emoji: '🏠',
    position: 0,
    stages: [
      { name: 'Cliente potencial',         emoji: '👤', color: '#a855f7', position: 0, sla_days: 2  },
      { name: 'Pre-Tasación (NURC)',       emoji: '🔍', color: '#6366f1', position: 1, sla_days: 3  },
      { name: 'Tasación',                  emoji: '📋', color: '#8b5cf6', position: 2, sla_days: 5  },
      { name: 'Captación y Relevamiento',  emoji: '📸', color: '#0ea5e9', position: 3, sla_days: 7  },
      { name: 'Comercialización y Visitas',emoji: '🏷️', color: '#f59e0b', position: 4, sla_days: 14 },
      { name: 'Reserva y Negociación',     emoji: '🤝', color: '#f97316', position: 5, sla_days: 10 },
      { name: 'Vendido / Cierre',          emoji: '✅', color: '#22c55e', position: 6               },
      { name: 'Perdido / Rechazado',       emoji: '❌', color: '#71717a', position: 7               },
    ],
  },

  /* ───────────────────────── 2. Comprador (Buscadores) ───────────────────────── */
  {
    name: 'Comprador (Buscadores)',
    emoji: '🔑',
    position: 1,
    stages: [
      { name: 'Cliente potencial',      emoji: '👤', color: '#a855f7', position: 0, sla_days: 2  },
      { name: 'Pre-calificación',      emoji: '🎯', color: '#6366f1', position: 1, sla_days: 2  },
      { name: 'Muestreo Activo',        emoji: '🏠', color: '#0ea5e9', position: 2, sla_days: 7  },
      { name: 'Reserva y Negociación',  emoji: '🤝', color: '#f97316', position: 3, sla_days: 10 },
      { name: 'Vendido / Cierre',       emoji: '✅', color: '#22c55e', position: 4               },
      { name: 'Perdido / Rechazado',    emoji: '❌', color: '#71717a', position: 5               },
    ],
  },

  /* ───────────────────────── 3. Dueños (Alquiler) ───────────────────────── */
  {
    name: 'Dueños (Alquiler)',
    emoji: '🏢',
    position: 2,
    stages: [
      { name: 'Cliente potencial',        emoji: '👤', color: '#a855f7', position: 0, sla_days: 2  },
      { name: 'Calificación y Tasación',  emoji: '📋', color: '#6366f1', position: 1, sla_days: 3  },
      { name: 'Publicación y Relevamiento',emoji: '📢', color: '#0ea5e9', position: 2, sla_days: 5  },
      { name: 'Selección de Inquilino',    emoji: '👤', color: '#f59e0b', position: 3, sla_days: 7  },
      { name: 'Contrato Firmado',          emoji: '✅', color: '#22c55e', position: 4               },
      { name: 'Perdido / Rechazado',       emoji: '❌', color: '#71717a', position: 5               },
    ],
  },

  /* ───────────────────────── 4. Inquilinos ───────────────────────── */
  {
    name: 'Inquilinos',
    emoji: '🧑‍💼',
    position: 3,
    stages: [
      { name: 'Cliente potencial',    emoji: '👤', color: '#a855f7', position: 0, sla_days: 2  },
      { name: 'Calificación (NURC)',  emoji: '🎯', color: '#6366f1', position: 1, sla_days: 1  },
      { name: 'Visitas',              emoji: '🏠', color: '#0ea5e9', position: 2, sla_days: 3  },
      { name: 'Reserva',              emoji: '📝', color: '#f97316', position: 3, sla_days: 5  },
      { name: 'Contrato Firmado',     emoji: '✅', color: '#22c55e', position: 4               },
      { name: 'Perdido / Rechazado',  emoji: '❌', color: '#71717a', position: 5               },
    ],
  },
]
