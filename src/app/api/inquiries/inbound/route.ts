import { NextResponse } from 'next/server'
import { processInbound, verifyHmac, type InboundPayload } from '@/lib/inquiries/inbound'

export const runtime = 'nodejs'

const SECRET = process.env.INBOUND_WEBHOOK_SECRET || ''

export async function POST(req: Request) {
  if (!SECRET) {
    return NextResponse.json({ error: 'server_misconfigured', code: 'NO_SECRET' }, { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')

  if (!verifyHmac(rawBody, signature, SECRET)) {
    return NextResponse.json({ error: 'invalid_signature', code: 'BAD_HMAC' }, { status: 401 })
  }

  let payload: InboundPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json', code: 'BAD_JSON' }, { status: 400 })
  }

  if (!payload.source || !payload.contact || !payload.property || !payload.captured_at) {
    return NextResponse.json(
      { error: 'missing_required_fields', code: 'BAD_BODY' },
      { status: 400 },
    )
  }

  try {
    const result = await processInbound(payload)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'processing_failed', code: 'PROC_ERR', reason: result.reason, action: result.action },
        { status: 422 },
      )
    }
    return NextResponse.json({
      ok: true,
      action: result.action,
      inquiry_id: result.inquiry_id,
      contact_id: result.contact_id,
    })
  } catch (err) {
    console.error('[inbound] fatal:', err)
    return NextResponse.json(
      { error: 'internal_error', code: 'INT_ERR', message: (err as Error).message },
      { status: 500 },
    )
  }
}
