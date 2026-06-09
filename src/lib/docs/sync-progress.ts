/**
 * Sync progress store backed by Netlify Blobs.
 * The background function writes; the status API route reads (UI polls it).
 * `getStore` only works inside the Netlify runtime (functions / `netlify dev`);
 * outside it, reads return null instead of throwing.
 */

import { getStore } from '@netlify/blobs'

const STORE_NAME = 'docs-sync'
const KEY = 'current'

export interface SyncProgress {
  state: 'running' | 'done' | 'error'
  mode: string
  agent: string | null
  message: string
  current: number
  total: number
  counts: { created: number; uploaded: number; classified: number }
  log: string[]
  error?: string
  startedAt: string
  updatedAt: string
}

export async function readProgress(): Promise<SyncProgress | null> {
  try {
    const store = getStore(STORE_NAME)
    return (await store.get(KEY, { type: 'json' })) as SyncProgress | null
  } catch {
    return null
  }
}

export async function writeProgress(p: SyncProgress): Promise<void> {
  const store = getStore(STORE_NAME)
  await store.setJSON(KEY, p)
}
