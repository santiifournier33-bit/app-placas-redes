import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ventas/supabase-admin'
import { getSession } from '@/lib/auth/session'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return null
  }
  return session
}

export async function GET(request: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const agent = searchParams.get('agent')

    let query = supabaseAdmin
      .from('operations')
      .select('*, operation_agents(*)')
      .order('close_date', { ascending: false })

    if (year) {
      const startDate = new Date(Number(year), (month ? Number(month) - 1 : 0), 1).toISOString().split('T')[0]
      const endDate = new Date(Number(year), (month ? Number(month) : 12), 0).toISOString().split('T')[0]
      query = query.gte('close_date', startDate).lte('close_date', endDate)
    }

    const { data, error } = await query
    if (error) throw error

    let filteredData = data
    if (agent && data) {
      filteredData = data.filter(op =>
        op.operation_agents.some((oa: any) => oa.agent_email === agent)
      )
    }

    return NextResponse.json({ success: true, data: filteredData })
  } catch (error: any) {
    console.error('Error fetching operations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const {
      type, status, property_address, property_detail, close_value, currency,
      reservation_date, close_date, total_fees_amount, fee_currency,
      observations, agents
    } = body

    // Validación
    if (!type || !property_address || close_value == null || !currency || total_fees_amount == null || !fee_currency) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: type, property_address, close_value, currency, total_fees_amount, fee_currency' }, { status: 400 })
    }

    const validTypes = ['boleto', 'escritura', 'alquiler_permanente', 'alquiler_temporario']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Tipo inválido. Debe ser: ${validTypes.join(', ')}` }, { status: 400 })
    }

    // 1. Crear la operación
    const { data: opData, error: opError } = await supabaseAdmin
      .from('operations')
      .insert({
        type,
        status: status || 'en_proceso',
        property_address,
        property_detail: property_detail || null,
        close_value: Number(close_value),
        currency,
        reservation_date: reservation_date || null,
        close_date: close_date || null,
        total_fees_amount: Number(total_fees_amount),
        fee_currency,
        observations: observations || null,
        created_by: session.email,
        office_total_share: 0,
        agents_total_share: 0
      })
      .select()
      .single()

    if (opError) throw opError

    // 2. Insertar agentes participantes
    let officeShare = Number(total_fees_amount)
    let agentsShare = 0

    if (agents && agents.length > 0) {
      const agentsToInsert = agents.map((a: any) => {
        const share = Number(a.agent_share_amount) || 0
        officeShare -= share
        agentsShare += share

        return {
          operation_id: opData.id,
          agent_email: a.agent_email,
          side: a.side,
          role_breakdown: a.role_breakdown || {},
          applied_band: a.applied_band || 'bronce',
          agent_share_amount: share,
          share_currency: fee_currency
        }
      })

      const { error: agentsError } = await supabaseAdmin
        .from('operation_agents')
        .insert(agentsToInsert)

      if (agentsError) {
        // Rollback
        await supabaseAdmin.from('operations').delete().eq('id', opData.id)
        throw agentsError
      }
    }

    // 3. Actualizar totales
    await supabaseAdmin
      .from('operations')
      .update({ office_total_share: officeShare, agents_total_share: agentsShare })
      .eq('id', opData.id)

    return NextResponse.json({ success: true, data: { ...opData, office_total_share: officeShare, agents_total_share: agentsShare } })
  } catch (error: any) {
    console.error('Error creating operation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 })

    // operation_agents se eliminan en cascada por FK
    const { error } = await supabaseAdmin
      .from('operations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting operation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
