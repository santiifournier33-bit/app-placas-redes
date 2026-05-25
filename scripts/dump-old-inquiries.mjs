// Dump de inquiries > 18 meses a JSONL antes del DELETE definitivo.
// Incluye contact_emails + contact_phones relacionados para preservar contexto.
// Output: backups/inquiries-pre-delete-<YYYYMMDD-HHmm>.jsonl
//
// Variables env:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const OUT_DIR = path.resolve(import.meta.dirname, '..', 'backups')
await fs.mkdir(OUT_DIR, { recursive: true })

const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
const outFile = path.join(OUT_DIR, `inquiries-pre-delete-${ts}.jsonl`)

const cutoffIso = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString()
console.error(`Cutoff: inquiries last_inquired_at < ${cutoffIso}`)

// Pagination loop (Supabase max 1000 rows per page)
const PAGE = 1000
let offset = 0
let total = 0
const contactIds = new Set()

const fh = await fs.open(outFile, 'w')
try {
  while (true) {
    const { data, error } = await sb
      .from('inquiries')
      .select('*')
      .lt('last_inquired_at', cutoffIso)
      .order('last_inquired_at', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) {
      await fh.write(JSON.stringify({ type: 'inquiry', ...row }) + '\n')
      if (row.contact_id) contactIds.add(row.contact_id)
    }
    total += data.length
    console.error(`  inquiries dumped: ${total}`)
    if (data.length < PAGE) break
    offset += PAGE
  }

  console.error(`Inquiries total dumped: ${total}`)
  console.error(`Unique contact_ids referenced: ${contactIds.size}`)

  // Dump related emails + phones (sample only - full PII may not be needed, but helps audit)
  if (contactIds.size > 0) {
    const ids = [...contactIds]
    // Chunked in case .in() has limits
    const CHUNK = 200
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK)
      const { data: emails } = await sb.from('contact_emails').select('*').in('contact_id', chunk)
      for (const e of emails ?? []) {
        await fh.write(JSON.stringify({ type: 'contact_email', ...e }) + '\n')
      }
      const { data: phones } = await sb.from('contact_phones').select('*').in('contact_id', chunk)
      for (const p of phones ?? []) {
        await fh.write(JSON.stringify({ type: 'contact_phone', ...p }) + '\n')
      }
    }
    console.error('Emails + phones dumped.')
  }
} finally {
  await fh.close()
}

const stat = await fs.stat(outFile)
console.error(`\nBackup file: ${outFile}`)
console.error(`Size: ${(stat.size / 1024).toFixed(1)} KB`)
console.error(`\nReview the file before running DELETE.`)
