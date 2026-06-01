import type { UserRole } from './session'

export interface SubModuleDefinition {
  id: string
  label: string
  href: string
  access?: UserRole[]   // if absent, inherits parent's access
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
      { id: 'tracker',     label: 'Tracker',     href: '/embudo?tab=tracker' },
      { id: 'calendario',  label: 'Calendario',  href: '/embudo?tab=calendario' },
      { id: 'leaderboard', label: 'Leaderboard', href: '/embudo?tab=leaderboard' },
      { id: 'metas',       label: 'Metas',       href: '/embudo?tab=metas', access: ['admin'] },
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
      { id: 'tareas',     label: 'Tareas',     href: '/productividad/tareas' },
      { id: 'negocios',   label: 'Negocios',   href: '/productividad/negocios' },
      { id: 'contactos',  label: 'Contactos',  href: '/productividad/contactos' },
      { id: 'calendario', label: 'Calendario', href: '/productividad/calendario' },
      { id: 'equipo',     label: 'Equipo',     href: '/productividad/equipo', access: ['admin'] },
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
      { id: 'properties',        label: 'Propiedades publicadas',  href: '/diseno?tab=properties' },
      { id: 'tokko_description', label: 'Descripción Tokko',       href: '/diseno?tab=tokko_description' },
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
    children: [
      { id: 'consultas',     label: 'Todas las consultas', href: '/consultas' },
      { id: 'mis-consultas', label: 'Mis consultas',        href: '/consultas/mis-consultas' },
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
      { id: 'produccion', label: 'Producción',    href: '/ventas?tab=produccion' },
      { id: 'actividad',  label: 'Actividad',     href: '/ventas?tab=actividad' },
      { id: 'balance',    label: 'Balance Anual', href: '/ventas?tab=balance' },
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
      { id: 'dashboard',   label: 'Dashboard',   href: '/servicios/dashboard' },
      { id: 'gastos',      label: 'Gastos',      href: '/servicios/gastos' },
      { id: 'categorias',  label: 'Categorías',  href: '/servicios/categorias' },
      { id: 'proveedores', label: 'Proveedores', href: '/servicios/proveedores' },
      { id: 'graficos',    label: 'Gráficos',    href: '/servicios/graficos' },
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
