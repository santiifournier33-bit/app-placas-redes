import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getApiUser } from '@/lib/auth/api-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getApiUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Service client bypasses RLS, so ownership must be enforced in code.
    // Non-admins can only act on their own inquiries; admins on any. Scoping
    // the UPDATE by owner_id means a foreign id simply affects zero rows → 403.
    const admin = createServiceClient()
    const isAdmin = user.role === 'admin'

    let query = admin
      .from('inquiries')
      .update({
        status: 'responded',
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq('id', id)

    if (!isAdmin) query = query.eq('owner_id', user.id)

    const { data, error } = await query.select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
