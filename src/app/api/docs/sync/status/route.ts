/**
 * GET /api/docs/sync/status
 * Returns the latest sync progress (written to Netlify Blobs by the background
 * function). The SyncPanel polls this while a sync is running.
 */

import { NextResponse } from 'next/server'
import { readProgress } from '@/lib/docs/sync-progress'

export async function GET() {
  const progress = await readProgress()
  return NextResponse.json(progress ?? { state: 'idle' })
}
