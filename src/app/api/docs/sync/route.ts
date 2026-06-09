/**
 * POST /api/docs/sync
 * Triggers the documentation sync, which runs in a Netlify Background Function
 * (`netlify/functions/docs-sync-background.ts`, up to 15 min). Returns immediately;
 * the UI polls GET /api/docs/sync/status (Netlify Blobs) for progress.
 *
 * Body: { mode: "folders" | "files" | "classify", agent: string | null }
 */

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const mode: string = body.mode || 'folders'
    const agent: string | null = body.agent || null

    const internalSecret = process.env.DOCS_SYNC_INTERNAL_SECRET
    if (!internalSecret) {
      return NextResponse.json(
        { error: 'DOCS_SYNC_INTERNAL_SECRET no configurado (requerido para disparar la sincronización)' },
        { status: 500 },
      )
    }

    const origin = new URL(request.url).origin
    const fnUrl = `${origin}/.netlify/functions/docs-sync-background`

    // Background functions return 202 and keep running asynchronously.
    // This route is admin-gated by middleware; forward a shared secret so the
    // public function URL only accepts calls originating from here.
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret,
      },
      body: JSON.stringify({ mode, agent }),
    })

    if (res.status !== 202 && !res.ok) {
      return NextResponse.json(
        { error: 'No se pudo iniciar la sincronización (función no disponible). Verificá que corra en Netlify.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ started: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
