// Purge test contacts/inquiries created during system testing.
// Default: DRY RUN — only counts. Pass --apply to actually delete.

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const APPLY = process.argv.includes('--apply')

const EMAILS = [
  'santiifournier33@gmail.com',
  'skiddyssj@gmail.com',
  'skiddy33ssj@gmail.com',
  'freirepropiedadespilar@gmail.com',
  'stellamaris_freire@hotmail.com',
]

// Phone patterns — match by suffix (last 10 digits) to tolerate +54 9, country codes etc.
const PHONE_SUFFIXES = ['1151454915', '1139447112']

// Name patterns — STRICT, no partial first-name only matches (avoids hitting other "Santiagos")
const NAME_PATTERNS = ['stella maris freire', 'santiago fournier']

// 1. Find contacts by email
const contactIdsToDelete = new Set()
const reasons = new Map() // contactId -> [reasons]

for (const email of EMAILS) {
  const { data: ces } = await sb.from('contact_emails').select('contact_id').eq('email', email)
  for (const r of ces ?? []) {
    contactIdsToDelete.add(r.contact_id)
    const list = reasons.get(r.contact_id) ?? []
    list.push(`email=${email}`)
    reasons.set(r.contact_id, list)
  }
  const { data: cs } = await sb.from('contacts').select('id').eq('primary_email', email)
  for (const r of cs ?? []) {
    contactIdsToDelete.add(r.id)
    const list = reasons.get(r.id) ?? []
    list.push(`primary_email=${email}`)
    reasons.set(r.id, list)
  }
}

// 2. Find contacts by phone suffix
// Note: a contact_phones secondary row may match without the contact being a test-data contact.
// We only treat a contact as test-data if PRIMARY phone matches OR if all evidence converges.
// Safer approach: also require that the contact has matching test-name OR test-email.
const phoneOnlyHits = new Set()  // contact_ids matched ONLY by phone, need cross-check
for (const suffix of PHONE_SUFFIXES) {
  const { data: cps } = await sb.from('contact_phones').select('contact_id,phone').ilike('phone', `%${suffix}`)
  for (const r of cps ?? []) {
    phoneOnlyHits.add(r.contact_id)
    const list = reasons.get(r.contact_id) ?? []
    list.push(`phone=${r.phone}`)
    reasons.set(r.contact_id, list)
  }
  const { data: cs } = await sb.from('contacts').select('id,primary_phone').ilike('primary_phone', `%${suffix}`)
  for (const r of cs ?? []) {
    contactIdsToDelete.add(r.id)
    const list = reasons.get(r.id) ?? []
    list.push(`primary_phone=${r.primary_phone}`)
    reasons.set(r.id, list)
  }
}
// Cross-check phoneOnlyHits: only include if contact also has matching test email OR test name
if (phoneOnlyHits.size > 0) {
  const { data: cs } = await sb.from('contacts').select('id,first_name,last_name,primary_email').in('id', [...phoneOnlyHits])
  for (const c of cs ?? []) {
    const fullName = `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase().trim()
    const emailMatch = c.primary_email && EMAILS.includes(c.primary_email.toLowerCase())
    const nameMatch = NAME_PATTERNS.some(n => fullName === n.toLowerCase())
    if (emailMatch || nameMatch) {
      contactIdsToDelete.add(c.id)
    } else {
      // Real contact with a test phone added as secondary — DO NOT delete contact, only delete the test phone row
      const list = reasons.get(c.id) ?? []
      list.push('(real contact, only test phone row will be removed)')
    }
  }
}

// 3. Find contacts by name pattern (be specific to avoid catching unrelated)
const exactNames = [
  { first: 'Stella Maris', last: 'Freire' },
  { first: 'Stella', last: 'Maris Freire' },
  { first: 'Santiago', last: 'Fournier' },
]
for (const n of exactNames) {
  const { data } = await sb.from('contacts').select('id,first_name,last_name')
    .ilike('first_name', n.first).ilike('last_name', n.last)
  for (const r of data ?? []) {
    contactIdsToDelete.add(r.id)
    const list = reasons.get(r.id) ?? []
    list.push(`name=${r.first_name} ${r.last_name}`)
    reasons.set(r.id, list)
  }
}

console.log(`\n=== Contacts to delete: ${contactIdsToDelete.size} ===`)
if (contactIdsToDelete.size > 0) {
  const { data: cs } = await sb.from('contacts').select('id,first_name,last_name,primary_email,primary_phone,owner_id').in('id', [...contactIdsToDelete])
  for (const c of cs ?? []) {
    console.log(` ${c.id}  ${c.first_name} ${c.last_name ?? ''} | ${c.primary_email ?? '-'} | ${c.primary_phone ?? '-'}  reasons=${(reasons.get(c.id)||[]).join('; ')}`)
  }
}

// 4. Find inquiries directly via raw_payload (in case contact_id missing or contact wasn't created)
const rawPayloadInquiryIds = new Set()
// by email in raw_payload.contact_email
for (const email of EMAILS) {
  const { data } = await sb.from('inquiries').select('id,raw_payload').eq('raw_payload->>contact_email', email)
  for (const r of data ?? []) rawPayloadInquiryIds.add(r.id)
}
// by phone suffix in raw_payload.contact_phone — these inquiries are CLEARLY test ones
// (the test phone appears as the buyer's phone in the consultation)
for (const suffix of PHONE_SUFFIXES) {
  const { data } = await sb.from('inquiries').select('id,raw_payload').ilike('raw_payload->>contact_phone', `%${suffix}`)
  for (const r of data ?? []) rawPayloadInquiryIds.add(r.id)
}
// by exact name in raw_payload.contact_name
for (const pat of NAME_PATTERNS) {
  const { data } = await sb.from('inquiries').select('id,raw_payload').ilike('raw_payload->>contact_name', pat)
  for (const r of data ?? []) rawPayloadInquiryIds.add(r.id)
}

// 5. Inquiries via contact_id FK
const { data: inqByContact } = contactIdsToDelete.size
  ? await sb.from('inquiries').select('id').in('contact_id', [...contactIdsToDelete])
  : { data: [] }
const inquiriesToDelete = new Set([
  ...(inqByContact ?? []).map(r => r.id),
  ...rawPayloadInquiryIds,
])

console.log(`\n=== Inquiries to delete: ${inquiriesToDelete.size} ===`)
console.log(` (${inqByContact?.length ?? 0} via contact FK + ${rawPayloadInquiryIds.size} direct raw_payload match)`)

if (inquiriesToDelete.size > 0) {
  const { data: inqs } = await sb.from('inquiries').select('id,tokko_property_reference,raw_payload,last_inquired_at').in('id', [...inquiriesToDelete])
  for (const i of (inqs ?? []).slice(0, 10)) {
    console.log(` ${i.id}  ref=${i.tokko_property_reference}  ${i.raw_payload?.contact_name} <${i.raw_payload?.contact_email}> ${i.raw_payload?.contact_phone ?? ''}  last=${i.last_inquired_at}`)
  }
  if ((inqs?.length ?? 0) > 10) console.log(`  ... +${(inqs.length - 10)} more`)
}

if (!APPLY) {
  console.log('\n[DRY RUN] no deletions performed. Pass --apply to actually delete.')
  process.exit(0)
}

// 6. APPLY mode — perform deletions in safe order
console.log('\n=== APPLYING DELETES ===')

// 6.0 — for "real contact, only test phone row" cases, delete just those phone rows
// (contacts NOT in contactIdsToDelete but had test-phone hits)
const realContactsWithTestPhone = [...phoneOnlyHits].filter(id => !contactIdsToDelete.has(id))
if (realContactsWithTestPhone.length > 0) {
  for (const suffix of PHONE_SUFFIXES) {
    const { error } = await sb.from('contact_phones').delete()
      .in('contact_id', realContactsWithTestPhone)
      .ilike('phone', `%${suffix}`)
    if (error) console.error('phone-row delete err:', error)
  }
  console.log(`cleaned test phone rows from ${realContactsWithTestPhone.length} real contacts`)
}

// 6a. delete inquiries
if (inquiriesToDelete.size > 0) {
  const { error } = await sb.from('inquiries').delete().in('id', [...inquiriesToDelete])
  if (error) { console.error('inquiries delete err:', error); process.exit(1) }
  console.log(`deleted ${inquiriesToDelete.size} inquiries`)
}

// 6b. delete contact_emails / contact_phones / contact_tasks etc. and finally contacts
if (contactIdsToDelete.size > 0) {
  const ids = [...contactIdsToDelete]
  const { error: e1 } = await sb.from('contact_emails').delete().in('contact_id', ids)
  if (e1) console.error('contact_emails delete err:', e1)
  const { error: e2 } = await sb.from('contact_phones').delete().in('contact_id', ids)
  if (e2) console.error('contact_phones delete err:', e2)
  // contacts last
  const { error: e3 } = await sb.from('contacts').delete().in('id', ids)
  if (e3) {
    console.error('contacts delete err:', e3)
    process.exit(1)
  }
  console.log(`deleted ${ids.length} contacts (+ their emails/phones)`)
}

console.log('\nDone.')
