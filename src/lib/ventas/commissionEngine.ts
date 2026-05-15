import { supabaseAdmin } from './supabase-admin'

export type CommissionBand = 'bronce' | 'plata' | 'oro'

export interface AgentQuarterStats {
  totalInvoicedUSD: number
  totalCaptations: number
}

/**
 * Calcula las estadísticas de un asesor en un rango de fechas.
 * - Facturación: suma de agent_share_amount en USD de operaciones cerradas.
 * - Captaciones: count de autorizaciones en el periodo.
 */
export async function getAgentStats(agentEmail: string, startDate: Date, endDate: Date): Promise<AgentQuarterStats> {
  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // Facturación (Honorarios del agente en operaciones cerradas)
  const { data: operations, error: opError } = await supabaseAdmin
    .from('operation_agents')
    .select(`
      agent_share_amount,
      share_currency,
      operations!inner(status, close_date)
    `)
    .eq('agent_email', agentEmail)
    .eq('operations.status', 'cerrada')
    .gte('operations.close_date', startStr)
    .lte('operations.close_date', endStr)

  if (opError) throw opError

  let totalInvoicedUSD = 0
  for (const op of operations || []) {
    if (op.share_currency === 'USD') {
      totalInvoicedUSD += Number(op.agent_share_amount)
    }
  }

  // Captaciones (Autorizaciones)
  const { count, error: actError } = await supabaseAdmin
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .eq('agent_email', agentEmail)
    .eq('type', 'autorizacion')
    .gte('activity_date', startStr)
    .lte('activity_date', endStr)

  if (actError) throw actError

  return {
    totalInvoicedUSD,
    totalCaptations: count || 0
  }
}

/**
 * Determina la banda de un asesor evaluando todos los trimestres previos del AÑO en curso.
 * Reglas:
 * - Al iniciar un nuevo año (Q1), todos arrancan en Bronce.
 * - Una vez que alcanza una banda superior, la mantiene el resto del año.
 * - Al terminar el año, se resetea.
 */
export async function calculateAgentBand(agentEmail: string, targetDate: Date = new Date()): Promise<CommissionBand> {
  const currentMonth = targetDate.getMonth()
  const year = targetDate.getFullYear()

  // Trimestre actual (1-4)
  let currentQuarter = 1
  if (currentMonth >= 3 && currentMonth <= 5) currentQuarter = 2
  else if (currentMonth >= 6 && currentMonth <= 8) currentQuarter = 3
  else if (currentMonth >= 9) currentQuarter = 4

  // Q1: siempre Bronce (reset anual)
  if (currentQuarter === 1) return 'bronce'

  // Evaluar todos los trimestres previos, quedarse con la mejor banda
  let bestBand: CommissionBand = 'bronce'

  for (let q = 1; q < currentQuarter; q++) {
    const startMonth = (q - 1) * 3
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, startMonth + 3, 0) // Último día del trimestre

    const stats = await getAgentStats(agentEmail, start, end)

    if (stats.totalInvoicedUSD > 15000 && stats.totalCaptations >= 8) {
      return 'oro' // Máxima alcanzada, salimos
    } else if (stats.totalInvoicedUSD > 10000 && stats.totalCaptations >= 6) {
      bestBand = 'plata'
    }
  }

  return bestBand
}

// ─── Split por roles ────────────────────────────────────

export type OperationSide = 'vendedor' | 'comprador' | 'doble_punta'

export interface RoleBreakdown {
  lead: boolean
  captacion?: boolean
  comercializacion?: boolean
  visitasCierre?: boolean
}

/**
 * Calcula el monto que se lleva un agente para UNA PUNTA de una operación.
 * Los porcentajes de rol se aplican directamente sobre los honorarios de la punta.
 * 
 * Punta Vendedora: Lead (20/25/30%) + Captación (15%) + Comercialización (15%) = 50/55/60%
 * Punta Compradora: Lead (20/25/30%) + Visitas/Cierre (30%) = 50/55/60%
 */
function calculateSingleSideShare(
  sideFeeAmount: number,
  sideType: 'vendedor' | 'comprador',
  band: CommissionBand,
  roles: RoleBreakdown
): number {
  const leadPct = band === 'oro' ? 0.30 : (band === 'plata' ? 0.25 : 0.20)
  let pct = 0

  if (sideType === 'vendedor') {
    if (roles.lead) pct += leadPct
    if (roles.captacion) pct += 0.15
    if (roles.comercializacion) pct += 0.15
  } else {
    if (roles.lead) pct += leadPct
    if (roles.visitasCierre) pct += 0.30
  }

  return sideFeeAmount * pct
}

/**
 * Calcula el monto que se lleva un agente según la punta, banda y roles.
 * - Punta simple (vendedor/comprador): aplica sobre el 50% de los honorarios totales.
 * - Doble punta: suma el cálculo de ambas puntas (cada una sobre el 50%).
 */
export function calculateAgentShare(
  totalOperationFeeAmount: number,
  side: OperationSide,
  band: CommissionBand,
  roles: RoleBreakdown
): number {
  const halfFee = totalOperationFeeAmount / 2

  if (side === 'doble_punta') {
    return (
      calculateSingleSideShare(halfFee, 'vendedor', band, roles) +
      calculateSingleSideShare(halfFee, 'comprador', band, roles)
    )
  }

  return calculateSingleSideShare(halfFee, side, band, roles)
}
