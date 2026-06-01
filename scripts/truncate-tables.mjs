import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno SUPABASE.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Orden inverso de dependencias
const tablesToClear = [
  'contact_activity_log',
  'contact_notes',
  'contact_pipelines',
  'signature_submissions',
  'calendar_events',
  'tasaciones',
  'funnel_activities',
  'activities',
  'operation_agents',
  'operations',
  'tasks',
  'task_sections',
  'tokko_sync_failures',
  'tokko_sync_state',
  'tokko_panel_session',
  'inquiries',
  'contact_emails',
  'contact_phones',
  'contacts'
]

async function run() {
  const isApply = process.argv.includes('--apply')
  console.log('=== Limpieza TOTAL de Tablas (REST API) ===')
  
  if (!isApply) {
    console.log('[DRY RUN] Tablas que se vaciarán:\n', tablesToClear.map(t => `- ${t}`).join('\n'))
    console.log('\nEjecuta con --apply para proceder a vaciar las tablas.')
    return
  }

  const BATCH_SIZE = 50 // Para no exceder el límite de URL de PostgREST

  for (const table of tablesToClear) {
    console.log(`\nVaciando tabla: ${table}...`)
    
    let hasMore = true
    let deletedCount = 0
    
    while (hasMore) {
      // Seleccionamos en batches más grandes para leer, pero borramos en batches chicos
      const { data, error } = await supabaseAdmin.from(table).select('*').limit(500)
      if (error) {
        console.error(`  Error leyendo ${table}:`, error.message)
        break
      }
      
      if (!data || data.length === 0) {
        hasMore = false
        break
      }
      
      const primaryKey = data[0].id ? 'id' : (data[0].uuid ? 'uuid' : Object.keys(data[0])[0])
      
      // Borrar en chunks de BATCH_SIZE
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE)
        const idsToDelete = chunk.map(row => row[primaryKey])
        
        const { error: delError } = await supabaseAdmin.from(table).delete().in(primaryKey, idsToDelete)
        if (delError) {
          console.error(`  Error borrando chunk en ${table}:`, delError.message)
          hasMore = false
          break
        } else {
          deletedCount += chunk.length
        }
      }
      
      if (data.length < 500) hasMore = false
    }
    
    console.log(`  -> ${deletedCount} filas eliminadas de ${table}.`)
  }
  
  console.log('\n=== VACIADO COMPLETADO ===')
}

run().catch(console.error)
