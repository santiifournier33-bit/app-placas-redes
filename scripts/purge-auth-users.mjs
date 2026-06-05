import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const TOKKO_API_KEY = process.env.TOKKO_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!TOKKO_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const ADMIN_EMAILS = ['freirepropiedadespilar@gmail.com', 'contacto@freirepropiedades.com']

async function run() {
  const isApply = process.argv.includes('--apply')

  console.log('1. Obteniendo agentes de Tokko Broker...')
  const tokkoRes = await fetch(`https://www.tokkobroker.com/api/v1/user/?key=${TOKKO_API_KEY}&format=json&limit=100`)
  const tokkoData = await tokkoRes.json()
  
  const tokkoEmails = tokkoData.objects
    .map(a => a.email?.trim().toLowerCase())
    .filter(Boolean)

  const keepEmails = new Set([...tokkoEmails, ...ADMIN_EMAILS])
  console.log(`\nAsesores/Admins a conservar (${keepEmails.size}):`)
  console.log(Array.from(keepEmails).join(', '))

  console.log('\n2. Obteniendo usuarios de Supabase Auth...')
  
  // listUsers soporta paginación, pero para menos de 50 usuarios con 1 llamada basta
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000
  })

  if (authErr) {
    console.error('Error al listar usuarios de Auth:', authErr.message)
    process.exit(1)
  }

  const users = authData.users
  const usersToDelete = users.filter(u => {
    const email = u.email?.trim().toLowerCase()
    return !email || !keepEmails.has(email)
  })

  console.log(`\n=== Usuarios encontrados en Auth: ${users.length} ===`)
  console.log(`=== Usuarios a ELIMINAR: ${usersToDelete.length} ===`)
  
  usersToDelete.forEach(u => {
    console.log(`- Eliminar: ${u.email} (ID: ${u.id})`)
  })

  if (usersToDelete.length === 0) {
    console.log('\nNada que hacer. Todos los usuarios son válidos.')
    return
  }

  if (!isApply) {
    console.log('\n[DRY RUN] Ejecuta con --apply para borrar estos usuarios permanentemente.')
    return
  }

  console.log('\n=== APLICANDO BORRADO ===')
  let deletedCount = 0
  for (const u of usersToDelete) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id)
    if (error) {
      console.error(`Error al borrar ${u.email}:`, error.message)
    } else {
      console.log(`Borrado: ${u.email}`)
      deletedCount++
    }
  }

  console.log(`\nFinalizado. ${deletedCount} usuarios eliminados.`)
}

run().catch(console.error)
