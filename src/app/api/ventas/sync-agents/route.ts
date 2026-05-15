import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ventas/supabase-admin'
import { getUserRole } from '@/lib/auth/session'

const TOKKO_API_KEY = process.env.TOKKO_API_KEY

interface TokkoAgent {
  id: number
  email: string
  name: string
  cellphone: string
  phone: string
  picture: string
  position: string
}

interface TokkoResponse {
  meta: {
    total_count: number
    limit: number
    offset: number
  }
  objects: TokkoAgent[]
}

export async function POST() {
  try {
    if (!TOKKO_API_KEY) {
      return NextResponse.json({ error: 'TOKKO_API_KEY no configurada' }, { status: 500 })
    }

    // 1. Fetch all agents from Tokko
    const response = await fetch(`https://www.tokkobroker.com/api/v1/user/?key=${TOKKO_API_KEY}&format=json&limit=100`)
    if (!response.ok) {
      throw new Error(`Error fetching Tokko API: ${response.statusText}`)
    }

    const data: TokkoResponse = await response.json()
    const tokkoAgents = data.objects

    // Filter out Admin (Stella Freire) based on role
    const validAgents = tokkoAgents.filter(agent => {
      // The instructions state that freirepropiedadespilar@gmail.com and Stella Freire are not agents, they are admins.
      // We can use the existing getUserRole logic, or directly filter.
      const role = getUserRole(agent.email || '')
      return role !== 'admin' && agent.email && agent.name
    })

    // 2. Fetch current agents from our DB to compare who is active
    const { data: existingAgents, error: dbError } = await supabaseAdmin
      .from('agent_history')
      .select('*')

    if (dbError) {
      throw dbError
    }

    const currentTokkoIds = validAgents.map(a => a.id)

    // 3. Prepare Upsert array
    const upsertData = validAgents.map(agent => ({
      tokko_agent_id: agent.id,
      email: agent.email.trim().toLowerCase(),
      name: agent.name,
      is_active_in_tokko: true,
      last_synced_at: new Date().toISOString()
    }))

    // Upsert active agents
    if (upsertData.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('agent_history')
        .upsert(upsertData, { onConflict: 'tokko_agent_id' })

      if (upsertError) {
        throw upsertError
      }
    }

    // 4. Mark agents not in Tokko as inactive
    const inactiveAgents = existingAgents
      .filter(dbAgent => !currentTokkoIds.includes(dbAgent.tokko_agent_id))
      .map(dbAgent => dbAgent.id)

    if (inactiveAgents.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('agent_history')
        .update({ is_active_in_tokko: false, last_synced_at: new Date().toISOString() })
        .in('id', inactiveAgents)

      if (updateError) {
        throw updateError
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completa. ${upsertData.length} asesores activos, ${inactiveAgents.length} inactivos.`,
      syncedCount: upsertData.length,
      inactiveCount: inactiveAgents.length
    })

  } catch (error: any) {
    console.error('Error syncing agents:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
