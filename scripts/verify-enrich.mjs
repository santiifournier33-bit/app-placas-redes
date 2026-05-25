import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const ids = ['41f6f8f9-2464-4e3f-a707-83a2dd3480f6','d1095ffc-7a45-416b-8c19-2c8c6bbc5d5f','096a9203-13fd-4672-b821-9950e5fb91ad']
const { data } = await sb.from('inquiries').select('id, tokko_property_reference, source_portal, user_preferences').in('id', ids)
for (const inq of data ?? []) {
  console.log('---')
  console.log('id:', inq.id, ' ref:', inq.tokko_property_reference, ' portal:', inq.source_portal)
  console.log('prefs:', JSON.stringify(inq.user_preferences, null, 2))
}

const { count } = await sb.from('inquiries').select('id', { count: 'exact', head: true }).not('user_preferences', 'is', null)
console.log('\nTotal inquiries with user_preferences:', count)
