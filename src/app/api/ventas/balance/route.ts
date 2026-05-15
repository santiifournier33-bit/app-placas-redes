import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ventas/supabase-admin'
import { getSession } from '@/lib/auth/session'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    // 1. Get all agents
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agent_history')
      .select('email, name, is_active_in_tokko')

    if (agentsError) throw agentsError

    // 2. Get all operations for the year
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: operations, error: opsError } = await supabaseAdmin
      .from('operation_agents')
      .select(`
        agent_email,
        agent_share_amount,
        share_currency,
        operations!inner(status, close_date, type)
      `)
      .eq('operations.status', 'cerrada')
      .gte('operations.close_date', startDate)
      .lte('operations.close_date', endDate)

    if (opsError) throw opsError

    // 3. Get all captations (autorizaciones) for the year
    const { data: activities, error: actError } = await supabaseAdmin
      .from('activities')
      .select('agent_email, activity_date')
      .eq('type', 'autorizacion')
      .gte('activity_date', startDate)
      .lte('activity_date', endDate)

    if (actError) throw actError

    // 4. Calculate stats per agent per month
    const balance = agents.map((agent: any) => {
      const monthly = Array(12).fill(0).map(() => ({
        facturacion: 0,
        lados: 0,
        captaciones: 0
      }))

      // Fill operations (facturacion & lados)
      const agentOps = operations.filter(op => op.agent_email === agent.email)
      for (const op of agentOps) {
        const joined = op.operations as unknown as { status: string; close_date: string; type: string }
        const date = new Date(joined.close_date)
        const monthIndex = date.getMonth() // 0-11
        
        // Sumamos facturacion USD (asumiendo share_currency USD por ahora para balance)
        if (op.share_currency === 'USD') {
          monthly[monthIndex].facturacion += Number(op.agent_share_amount)
        }
        monthly[monthIndex].lados += 1
      }

      // Fill captations
      const agentActs = activities.filter(act => act.agent_email === agent.email)
      for (const act of agentActs) {
        const date = new Date(act.activity_date)
        const monthIndex = date.getMonth()
        monthly[monthIndex].captaciones += 1
      }

      return {
        email: agent.email,
        name: agent.name,
        isActive: agent.is_active_in_tokko,
        monthly
      }
    })

    return NextResponse.json({ success: true, year, data: balance })
  } catch (error: any) {
    console.error('Error calculating balance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
