import { NextResponse } from 'next/server'
import { verifyHmac } from '@/lib/inquiries/inbound'
import { parseZonapropEmail } from '@/lib/inquiries/parsers/zonaprop'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

const SECRET = process.env.INBOUND_WEBHOOK_SECRET || ''

interface ReqBody {
  subject: string
  html_body: string
  received_at?: string  // ISO timestamp of email received
  gmail_message_id?: string  // for idempotency log
}

export async function POST(req: Request) {
  if (!SECRET) return NextResponse.json({ error: 'no_secret' }, { status: 500 })

  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')
  if (!verifyHmac(rawBody, signature, SECRET)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: ReqBody
  try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  if (!payload.subject || !payload.html_body) {
    return NextResponse.json({ error: 'missing_subject_or_body' }, { status: 400 })
  }

  const parsed = parseZonapropEmail(payload.subject, payload.html_body)
  if (!parsed.reference_code) {
    return NextResponse.json({ ok: false, reason: 'no_reference_code_in_subject', parsed }, { status: 200 })
  }

  const supabase = createServiceClient()

  // Find matching inquiry:
  // 1. By reference_code (tokko_property_reference)
  // 2. Same contact_email
  // 3. Recent (received_at ±10 min preferred, else latest)
  const refCode = parsed.reference_code
  const contactEmail = parsed.contact.email?.toLowerCase()

  // First filter by reference_code
  let query = supabase
    .from('inquiries')
    .select('id, contact_id, last_inquired_at, user_preferences, tokko_property_reference')
    .eq('tokko_property_reference', refCode)
    .order('last_inquired_at', { ascending: false })

  const { data: candidates, error } = await query.limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no_inquiry_for_ref', refCode }, { status: 200 })
  }

  // Refine by contact_email
  let chosen = null
  if (contactEmail) {
    const { data: ce } = await supabase
      .from('contact_emails')
      .select('contact_id')
      .eq('email', contactEmail)
      .maybeSingle()
    if (ce) {
      chosen = candidates.find(c => c.contact_id === ce.contact_id) ?? null
    }
  }

  // Fallback: refine by time proximity
  if (!chosen && payload.received_at) {
    const target = new Date(payload.received_at).getTime()
    let bestDiff = Infinity
    for (const c of candidates) {
      const diff = Math.abs(new Date(c.last_inquired_at).getTime() - target)
      if (diff < bestDiff && diff < 30 * 60 * 1000) {  // 30 min window
        bestDiff = diff
        chosen = c
      }
    }
  }

  // Last fallback: most recent
  if (!chosen) chosen = candidates[0]

  // Update inquiry with user_preferences
  const { error: uErr } = await supabase
    .from('inquiries')
    .update({
      user_preferences: parsed.user_preferences,
      source_portal: 'zonaprop',
    })
    .eq('id', chosen.id)

  if (uErr) return NextResponse.json({ error: 'update_failed', reason: uErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    inquiry_id: chosen.id,
    reference_code: refCode,
    preferences_keys: Object.keys(parsed.user_preferences ?? {}),
    matched_by: chosen.contact_id ? 'contact_email_or_proximity' : 'reference_code_only',
  })
}
