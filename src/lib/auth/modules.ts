import type { UserRole } from './session'

export interface ModuleDefinition {
  id: string
  label: string
  href: string
  icon: string
  access: UserRole[]
  description: string
  enabled: boolean
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
    id: 'productividad',
    label: 'Productividad',
    href: '/productividad',
    icon: 'TaskSquare',
    access: ['admin', 'asesor'],
    description: 'Tareas, negocios, equipo y contactos',
    enabled: true,
  },
  {
    id: 'diseno',
    label: 'Diseño',
    href: '/diseno',
    icon: 'Brush2',
    access: ['admin', 'asesor'],
    description: 'Placas, copy, PDFs y videos',
    enabled: true,
  },
  {
    id: 'consultas',
    label: 'Consultas',
    href: '/consultas',
    icon: 'MessageQuestion',
    access: ['admin', 'asesor'],
    description: 'Consultas de propiedades',
    enabled: false,
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
  },
  {
    id: 'servicios',
    label: 'Servicios',
    href: '/servicios',
    icon: 'Receipt1',
    access: ['admin'],
    description: 'Gastos y vencimientos',
    enabled: true,
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
