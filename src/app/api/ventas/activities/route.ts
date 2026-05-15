import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ventas/supabase-admin'
import { getSession } from '@/lib/auth/session'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
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
      .from('activities')
      .select('*, agent_history(name)')
      .order('activity_date', { ascending: false })

    if (year) {
      const startDate = new Date(Number(year), (month ? Number(month) - 1 : 0), 1).toISOString().split('T')[0]
      const endDate = new Date(Number(year), (month ? Number(month) : 12), 0).toISOString().split('T')[0]
      query = query.gte('activity_date', startDate).lte('activity_date', endDate)
    }

    if (agent) {
      query = query.eq('agent_email', agent)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const {
      type, property_address, operation_type, value, currency,
      activity_date, agent_email, estimated_fees, observations, status
    } = body

    // Validación
    if (!type || !property_address || !operation_type || value == null || !currency || !activity_date || !agent_email) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    if (!['reserva', 'autorizacion'].includes(type)) {
      return NextResponse.json({ error: 'Tipo debe ser: reserva o autorizacion' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('activities')
      .insert({
        type, property_address, operation_type,
        value: Number(value), currency, activity_date,
        agent_email, estimated_fees: estimated_fees ? Number(estimated_fees) : null,
        observations: observations || null,
        status: status || 'activa'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error creating activity:', error)
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

    const { error } = await supabaseAdmin
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting activity:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
