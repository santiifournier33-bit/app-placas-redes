import type { Category, MacroCategory } from "@/lib/stores/serviciosStore"

export const SEED_MACRO_CATEGORIES: MacroCategory[] = [
  { id: "macro-oficina",     name: "Oficina",        iconName: "Building2",  color: "#3b82f6", isCustom: false },
  { id: "macro-operaciones", name: "Operaciones",    iconName: "Settings2",  color: "#0ea5e9", isCustom: false },
  { id: "macro-marketing",   name: "Marketing",      iconName: "Megaphone",  color: "#ec4899", isCustom: false },
  { id: "macro-tecnologia",  name: "Tecnología",     iconName: "Monitor",    color: "#8b5cf6", isCustom: false },
  { id: "macro-legal",       name: "Legal/Contable", iconName: "Scale",      color: "#f59e0b", isCustom: false },
  { id: "macro-personal",    name: "Personal",       iconName: "User",       color: "#10b981", isCustom: false },
]

export const GROUP_TO_MACRO: Record<string, string> = {
  operativos:    "macro-operaciones",
  marketing:     "macro-marketing",
  tecnologia:    "macro-tecnologia",
  profesionales: "macro-legal",
  personales:    "macro-personal",
}

export const SEED_CATEGORIES: Category[] = [
  // Oficina
  { id: "cat-alquiler",      name: "Alquiler",             iconName: "Building2",  color: "#3b82f6", isCustom: false, macroCategoryId: "macro-oficina" },
  { id: "cat-limpieza",      name: "Limpieza",             iconName: "Sparkles",   color: "#a3e635", isCustom: false, macroCategoryId: "macro-oficina" },
  { id: "cat-mantenimiento", name: "Mantenimiento",        iconName: "Wrench",     color: "#64748b", isCustom: false, macroCategoryId: "macro-oficina" },
  { id: "cat-electricidad",  name: "Electricidad",         iconName: "Zap",        color: "#eab308", isCustom: false, macroCategoryId: "macro-oficina" },
  { id: "cat-agua",          name: "Agua",                 iconName: "Droplet",    color: "#0ea5e9", isCustom: false, macroCategoryId: "macro-oficina" },
  { id: "cat-internet",      name: "Internet",             iconName: "Wifi",       color: "#06b6d4", isCustom: false, macroCategoryId: "macro-oficina" },

  // Operaciones
  { id: "cat-portales",      name: "Portales inmobiliarios", iconName: "Globe",    color: "#8b5cf6", isCustom: false, macroCategoryId: "macro-operaciones" },
  { id: "cat-movilidad",     name: "Movilidad",            iconName: "Car",        color: "#f97316", isCustom: false, macroCategoryId: "macro-operaciones" },
  { id: "cat-relevamientos", name: "Relevamientos",        iconName: "Map",        color: "#0d9488", isCustom: false, macroCategoryId: "macro-operaciones" },

  // Marketing
  { id: "cat-meta-ads",      name: "Meta Ads",             iconName: "Facebook",   color: "#1877f2", isCustom: false, macroCategoryId: "macro-marketing" },
  { id: "cat-google-ads",    name: "Google Ads",           iconName: "Search",     color: "#ea4335", isCustom: false, macroCategoryId: "macro-marketing" },
  { id: "cat-diseno",        name: "Diseño gráfico",       iconName: "Palette",    color: "#ec4899", isCustom: false, macroCategoryId: "macro-marketing" },
  { id: "cat-fotografia",    name: "Fotografía",           iconName: "Camera",     color: "#f97316", isCustom: false, macroCategoryId: "macro-marketing" },

  // Tecnología
  { id: "cat-crm",           name: "CRM",                  iconName: "Database",   color: "#10b981", isCustom: false, macroCategoryId: "macro-tecnologia" },
  { id: "cat-hosting",       name: "Hosting",              iconName: "Server",     color: "#6366f1", isCustom: false, macroCategoryId: "macro-tecnologia" },
  { id: "cat-dominios",      name: "Dominios",             iconName: "Link",       color: "#14b8a6", isCustom: false, macroCategoryId: "macro-tecnologia" },
  { id: "cat-ia",            name: "IA",                   iconName: "Sparkle",    color: "#a855f7", isCustom: false, macroCategoryId: "macro-tecnologia" },
  { id: "cat-software",      name: "Software",             iconName: "AppWindow",  color: "#0284c7", isCustom: false, macroCategoryId: "macro-tecnologia" },
  { id: "cat-saas",          name: "SaaS",                 iconName: "Cloud",      color: "#0891b2", isCustom: false, macroCategoryId: "macro-tecnologia" },

  // Legal/Contable
  { id: "cat-escribania",    name: "Escribanía",           iconName: "ScrollText", color: "#a16207", isCustom: false, macroCategoryId: "macro-legal" },
  { id: "cat-gestoria",      name: "Gestoría",             iconName: "Briefcase",  color: "#854d0e", isCustom: false, macroCategoryId: "macro-legal" },
  { id: "cat-abogados",      name: "Abogados",             iconName: "Scale",      color: "#7c2d12", isCustom: false, macroCategoryId: "macro-legal" },
  { id: "cat-contabilidad",  name: "Contabilidad",         iconName: "Calculator", color: "#9a3412", isCustom: false, macroCategoryId: "macro-legal" },

  // Personal
  { id: "cat-salud",         name: "Salud",                iconName: "HeartPulse", color: "#ef4444", isCustom: false, macroCategoryId: "macro-personal" },
  { id: "cat-tarjetas",      name: "Tarjetas",             iconName: "CreditCard", color: "#db2777", isCustom: false, macroCategoryId: "macro-personal" },
  { id: "cat-personales-s",  name: "Personales Santiago",  iconName: "User",       color: "#0d9488", isCustom: false, macroCategoryId: "macro-personal" },
  { id: "cat-personales-st", name: "Personales Stella",    iconName: "User",       color: "#be185d", isCustom: false, macroCategoryId: "macro-personal" },
]

export const ICON_SET: { name: string; label: string }[] = [
  { name: "Building2",   label: "Oficina" },
  { name: "Home",        label: "Casa" },
  { name: "Zap",         label: "Electricidad" },
  { name: "Wifi",        label: "Internet" },
  { name: "Droplet",     label: "Agua" },
  { name: "Sparkles",    label: "Limpieza" },
  { name: "Wrench",      label: "Herramientas" },
  { name: "Globe",       label: "Web" },
  { name: "Facebook",    label: "Facebook" },
  { name: "Search",      label: "Búsqueda" },
  { name: "Palette",     label: "Diseño" },
  { name: "Camera",      label: "Cámara" },
  { name: "Database",    label: "Base de datos" },
  { name: "Server",      label: "Servidor" },
  { name: "Link",        label: "Enlace" },
  { name: "Sparkle",     label: "IA" },
  { name: "AppWindow",   label: "Software" },
  { name: "Cloud",       label: "Nube" },
  { name: "ScrollText",  label: "Documento" },
  { name: "Briefcase",   label: "Maletín" },
  { name: "Scale",       label: "Justicia" },
  { name: "Calculator",  label: "Calculadora" },
  { name: "HeartPulse",  label: "Salud" },
  { name: "CreditCard",  label: "Tarjeta" },
  { name: "User",        label: "Persona" },
  { name: "Megaphone",   label: "Marketing" },
  { name: "Monitor",     label: "Pantalla" },
  { name: "Car",         label: "Auto" },
  { name: "Map",         label: "Mapa" },
  { name: "ShoppingBag", label: "Compras" },
  { name: "Utensils",    label: "Comida" },
  { name: "Tag",         label: "Etiqueta" },
  { name: "Package",     label: "Paquete" },
  { name: "DollarSign",  label: "Dinero" },
  { name: "TrendingUp",  label: "Tendencia" },
  { name: "Settings2",   label: "Config" },
  { name: "BarChart3",   label: "Gráfico" },
  { name: "FileText",    label: "Archivo" },
  { name: "Phone",       label: "Teléfono" },
  { name: "Mail",        label: "Email" },
]

export const COLOR_PRESETS = [
  "#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981",
  "#a3e635", "#eab308", "#f97316", "#ef4444", "#ec4899",
  "#8b5cf6", "#6366f1", "#a855f7", "#64748b", "#1877f2",
]
