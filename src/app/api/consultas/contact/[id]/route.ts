import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getApiUser } from '@/lib/auth/api-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getApiUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = user.role === 'admin'

    // Service client bypasses RLS so we can see contacts owned by other advisors.
    // PII is masked in code below for non-admin users when contact.owner_id !== user.id.
    const admin = createServiceClient()

    const { data: contact } = await admin
      .from('contacts')
      .select('id, first_name, last_name, owner_id, source, created_at, lead_status')
      .eq('id', id)
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'contact_not_found' }, { status: 404 })
    }

    const isOwn = contact.owner_id === user.id
    const canSeePII = isAdmin || isOwn

    const [{ data: emails }, { data: phones }, { data: inquiries }] = await Promise.all([
      admin.from('contact_emails').select('email').eq('contact_id', id),
      admin.from('contact_phones').select('phone').eq('contact_id', id),
      admin
        .from('inquiries')
        .select('id, tokko_property_id, tokko_property_reference, property_snapshot, source_portal, status, first_inquired_at, last_inquired_at, comment, user_preferences, property_active')
        .eq('contact_id', id)
        .order('last_inquired_at', { ascending: false }),
    ])

    const display = canSeePII
      ? {
          full_name: `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Sin nombre',
          email: (emails ?? [])[0]?.email ?? null,
          all_emails: (emails ?? []).map(e => e.email),
          phone: (phones ?? [])[0]?.phone ?? null,
          all_phones: (phones ?? []).map(p => p.phone),
        }
      : {
          full_name: contact.first_name ?? 'Contacto',
          email: null,
          all_emails: [],
          phone: null,
          all_phones: [],
        }

    return NextResponse.json({
      contact: {
        id: contact.id,
        ...display,
        is_own: isOwn,
        viewer_role: isAdmin ? 'admin' : 'asesor',
        source: contact.source,
        lead_status: contact.lead_status,
        created_at: contact.created_at,
      },
      inquiries: inquiries ?? [],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
