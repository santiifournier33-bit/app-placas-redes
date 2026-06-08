import type { UserRole } from './session'

export interface SubModuleDefinition {
  id: string
  label: string
  href: string
  icon?: string         // lucide icon name resolved by SideNav.getIcon
  access?: UserRole[]   // if absent, inherits parent's access
  /**
   * Phase gating (soft rollout). Roles listed here see this sub-section as
   * "Próximamente" (visible but disabled) and are redirected to /dashboard if
   * they hit the URL directly. Distinct from `access` (hard role permission):
   * lockedFor is temporary, removed when the feature ships in a later phase.
   */
  lockedFor?: UserRole[]
}

export interface ModuleDefinition {
  id: string
  label: string
  href: string
  icon: string
  access: UserRole[]
  description: string
  enabled: boolean
  /**
   * Phase gating (soft rollout). Roles listed here see the whole module as
   * "Próximamente" (visible but disabled) and are redirected to /dashboard if
   * they hit any of its URLs directly. Distinct from `enabled:false` (module
   * not in production at all) — lockedFor is temporary and per-role.
   */
  lockedFor?: UserRole[]
  /**
   * If present, sidebar renders this module as an accordion. Children are
   * the deepest navigable items (sub-routes or tab queries) that the user
   * can land on. Parent row toggles expand/collapse (no navigation).
   */
  children?: SubModuleDefinition[]
}

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'Home',
    access: ['admin', 'asesor'],
    description: 'Resumen y métricas rápidas',
    enabled: true,
  },
  {
    id: 'embudo',
    label: 'Embudo',
    href: '/embudo',
    icon: 'Target',
    access: ['admin', 'asesor'],
    description: 'Tracker de actividad y embudo de ventas',
    enabled: true,
    children: [
      { id: 'tracker',     label: 'Tracker',     href: '/embudo?tab=tracker',     icon: 'Activity' },
      { id: 'calendario',  label: 'Calendario',  href: '/embudo?tab=calendario',  icon: 'Calendar' },
      { id: 'leaderboard', label: 'Leaderboard', href: '/embudo?tab=leaderboard', icon: 'Trophy' },
      { id: 'metas',       label: 'Metas',       href: '/embudo?tab=metas',       icon: 'Flag', access: ['admin'] },
    ],
  },
  {
    id: 'productividad',
    label: 'Productividad',
    href: '/productividad/tareas',
    icon: 'TaskSquare',
    access: ['admin', 'asesor'],
    description: 'Tareas, negocios, equipo y contactos',
    enabled: true,
    children: [
      { id: 'tareas',     label: 'Tareas',     href: '/productividad/tareas',     icon: 'CheckSquare' },
      { id: 'negocios',   label: 'Negocios',   href: '/productividad/negocios',   icon: 'Briefcase' },
      { id: 'contactos',  label: 'Contactos',  href: '/productividad/contactos',  icon: 'Users' },
      { id: 'calendario', label: 'Calendario', href: '/productividad/calendario', icon: 'Calendar' },
    ],
  },
  {
    id: 'diseno',
    label: 'Diseño',
    href: '/diseno',
    icon: 'Brush2',
    access: ['admin', 'asesor'],
    description: 'Placas, copy, PDFs y videos',
    enabled: true,
    children: [
      { id: 'properties',        label: 'Propiedades publicadas',  href: '/diseno?tab=properties',        icon: 'Building2' },
      { id: 'tokko_description', label: 'Descripción Tokko',       href: '/diseno?tab=tokko_description', icon: 'FileText' },
    ],
  },
  {
    id: 'consultas',
    label: 'Consultas',
    href: '/consultas',
    icon: 'MessageQuestion',
    access: ['admin', 'asesor'],
    description: 'Consultas de propiedades + matching engine',
    enabled: true,
    lockedFor: ['asesor'],
    children: [
      { id: 'consultas',     label: 'Todas las consultas', href: '/consultas',              icon: 'Inbox' },
      { id: 'mis-consultas', label: 'Mis consultas',        href: '/consultas/mis-consultas', icon: 'UserCheck' },
    ],
  },
  {
    id: 'procedimientos',
    label: 'Procedimientos',
    href: '/procedimientos',
    icon: 'Book1',
    access: ['admin', 'asesor'],
    description: 'Asistente IA inmobiliario',
    enabled: true,
  },
  {
    id: 'firmas',
    label: 'Firmas electrónicas',
    href: '/firmas',
    icon: 'Signature',
    access: ['admin', 'asesor'],
    description: 'Firmas digitales de contratos',
    enabled: true,
    lockedFor: ['asesor'],
  },
  {
    id: 'documentacion',
    label: 'Documentación',
    href: '/documentacion',
    icon: 'FolderOpen',
    access: ['admin'],
    description: 'Archivos de propiedades',
    enabled: true,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    href: '/marketing',
    icon: 'Chart',
    access: ['admin'],
    description: 'Dashboard de marketing',
    enabled: false,
  },
  {
    id: 'ventas',
    label: 'Ventas',
    href: '/ventas',
    icon: 'DollarSquare',
    access: ['admin'],
    description: 'Operaciones y comisiones',
    enabled: true,
    children: [
      { id: 'produccion', label: 'Producción',    href: '/ventas?tab=produccion', icon: 'TrendingUp' },
      { id: 'actividad',  label: 'Actividad',     href: '/ventas?tab=actividad',  icon: 'Activity' },
      { id: 'balance',    label: 'Balance Anual', href: '/ventas?tab=balance',    icon: 'Scale' },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios',
    href: '/servicios/dashboard',
    icon: 'Receipt1',
    access: ['admin'],
    description: 'Gastos y vencimientos',
    enabled: true,
    children: [
      { id: 'dashboard',   label: 'Dashboard',   href: '/servicios/dashboard',   icon: 'LayoutDashboard' },
      { id: 'gastos',      label: 'Gastos',      href: '/servicios/gastos',      icon: 'Receipt' },
      { id: 'categorias',  label: 'Categorías',  href: '/servicios/categorias',  icon: 'Tags' },
      { id: 'proveedores', label: 'Proveedores', href: '/servicios/proveedores', icon: 'Truck' },
      { id: 'graficos',    label: 'Gráficos',    href: '/servicios/graficos',    icon: 'PieChart' },
    ],
  },
  {
    id: 'correo',
    label: 'Correo',
    href: '/correo',
    icon: 'Sms',
    access: ['admin', 'asesor'],
    description: 'Email corporativo',
    enabled: true,
    lockedFor: ['asesor'],
  },
]

export function getModulesForRole(role: UserRole): ModuleDefinition[] {
  return modules.filter(m => m.access.includes(role))
}

export function isModuleAccessible(moduleId: string, role: UserRole): boolean {
  const mod = modules.find(m => m.id === moduleId)
  if (!mod) return false
  return mod.access.includes(role)
}

/** Whole module phase-gated for this role (soft rollout → "Próximamente"). */
export function isModuleLocked(mod: ModuleDefinition, role: UserRole): boolean {
  return mod.lockedFor?.includes(role) ?? false
}

/** Sub-section phase-gated for this role. */
export function isSubLocked(sub: SubModuleDefinition, role: UserRole): boolean {
  return sub.lockedFor?.includes(role) ?? false
}

// Strip any ?query from an href to compare bare paths.
function basePath(href: string): string {
  return href.split('?')[0]
}

function pathMatches(target: string, pathname: string): boolean {
  return pathname === target || pathname.startsWith(target + '/')
}

/**
 * Is the given URL phase-locked for this role? Used by the route guard to
 * redirect asesores away from blocked modules/sub-sections they reach via a
 * direct URL. Sub-sections are checked first (more specific); a locked parent
 * module covers all of its routes.
 */
export function isPathLocked(pathname: string, role: UserRole): boolean {
  for (const mod of modules) {
    for (const sub of mod.children ?? []) {
      if (pathMatches(basePath(sub.href), pathname) && isSubLocked(sub, role)) {
        return true
      }
    }
    if (pathMatches(basePath(mod.href), pathname) && isModuleLocked(mod, role)) {
      return true
    }
  }
  return false
}
