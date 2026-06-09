// Documentation sync — Netlify Background Function (15 min budget, async).
//
// Replaces the local `tokko-drive-sync` child-process worker for production.
// Pipeline (all HTTP): Tokko API (properties) → Tokko panel scrape (files) →
// Gemini classify → upload to Google Drive. Progress is streamed to Netlify
// Blobs and polled by the UI via /api/docs/sync/status.
//
// The `@/` alias does NOT resolve in the function bundle → relative imports.

import { timingSafeEqual } from 'crypto'
import { getAllProperties, getAgentName, buildFolderName } from '../../src/lib/docs/tokko-server'
import { TokkoSession } from '../../src/lib/docs/tokko-scrape-server'
import { classifyFile, extractLocation } from '../../src/lib/docs/gemini-docs'
import { getDriveWrite, getRootFolderId } from '../../src/lib/docs/drive-server'
import { findOrCreateFolder, uploadFile } from '../../src/lib/docs/drive-write-ops'
import { writeProgress, type SyncProgress } from '../../src/lib/docs/sync-progress'

type Mode = 'folders' | 'files' | 'classify'

/**
 * Netlify functions are exposed on a public URL, so this endpoint must
 * authenticate itself — the only legitimate caller is the admin-gated
 * /api/docs/sync route, which forwards a shared secret.
 */
function isAuthorized(req: Request): boolean {
  const expected = process.env.DOCS_SYNC_INTERNAL_SECRET
  if (!expected) return false
  const got = req.headers.get('x-internal-secret') || ''
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const handler = async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  if (!isAuthorized(req)) return new Response('unauthorized', { status: 401 })

  let mode: Mode = 'folders'
  let agentFilter: string | null = null
  try {
    const body = await req.json()
    mode = (body.mode as Mode) || 'folders'
    agentFilter = (body.agent as string | null) || null
  } catch {
    // no body → defaults
  }

  const now = () => new Date().toISOString()
  const progress: SyncProgress = {
    state: 'running',
    mode,
    agent: agentFilter,
    message: 'Iniciando…',
    current: 0,
    total: 0,
    counts: { created: 0, uploaded: 0, classified: 0 },
    log: [],
    startedAt: now(),
    updatedAt: now(),
  }

  let lastFlush = 0
  const flush = async (force = false) => {
    progress.updatedAt = now()
    const t = Date.now()
    if (force || t - lastFlush > 1500) {
      lastFlush = t
      await writeProgress(progress)
    }
  }
  const log = async (message: string) => {
    progress.message = message
    progress.log.push(message)
    if (progress.log.length > 200) progress.log.shift()
    await flush()
  }

  try {
    const apiKey = process.env.TOKKO_API_KEY
    const rootFolderId = getRootFolderId()
    if (!apiKey) throw new Error('TOKKO_API_KEY no configurado')

    await log('Obteniendo propiedades de Tokko Broker…')
    const properties = await getAllProperties(apiKey)

    // Group by agent
    const byAgent = new Map<string, Record<string, unknown>[]>()
    for (const prop of properties) {
      const name = getAgentName(prop)
      if (!byAgent.has(name)) byAgent.set(name, [])
      byAgent.get(name)!.push(prop)
    }

    const drive = getDriveWrite()

    // Tokko panel login (only needed to fetch/upload files)
    let session: TokkoSession | null = null
    if (mode === 'files' || mode === 'classify') {
      // Reuse the existing Netlify panel credentials (TOKKO_PANEL_*); fall back to
      // the local tokko-drive-sync names for `netlify dev`.
      const email = process.env.TOKKO_PANEL_EMAIL || process.env.TOKKO_EMAIL
      const password = process.env.TOKKO_PANEL_PASSWORD || process.env.TOKKO_PASSWORD
      if (!email || !password) throw new Error('TOKKO_PANEL_EMAIL / TOKKO_PANEL_PASSWORD no configurados')
      await log('Iniciando sesión en Tokko…')
      session = new TokkoSession()
      await session.login(email, password)
      await log('✓ Login Tokko OK')
    }

    // Map existing Drive folders (agent → propertyId → {folderId,parentFolderId,name})
    await log('Mapeando estructura actual en Drive…')
    const globalDriveProps = new Map<string, { folderId: string; parentFolderId: string; name: string }>()
    const agentFoldersCache = new Map<string, string>()
    const agentsRes = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 100,
    })
    for (const agent of agentsRes.data.files || []) {
      agentFoldersCache.set(agent.name!, agent.id!)
      let pageToken: string | undefined
      do {
        const propsRes = await drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and '${agent.id}' in parents and trashed=false`,
          fields: 'nextPageToken, files(id, name)',
          pageSize: 1000,
          pageToken,
        })
        for (const file of propsRes.data.files || []) {
          const propId = file.name?.split(' - ')[0]?.trim()
          if (propId && /^\d+$/.test(propId) && !globalDriveProps.has(propId)) {
            globalDriveProps.set(propId, { folderId: file.id!, parentFolderId: agent.id!, name: file.name! })
          }
        }
        pageToken = propsRes.data.nextPageToken || undefined
      } while (pageToken)
    }

    const agentEntries = [...byAgent.entries()].filter(
      ([name]) => !agentFilter || name.toLowerCase().includes(agentFilter.toLowerCase()),
    )

    let totalNew = 0
    for (const [, agentProps] of agentEntries) {
      totalNew += agentProps.filter((p) => !globalDriveProps.has(String((p as { id: unknown }).id))).length
    }
    progress.total = totalNew
    await log(`${totalNew} propiedades nuevas detectadas`)

    for (const [agentName, agentProps] of agentEntries) {
      let agentFolderId = agentFoldersCache.get(agentName)
      if (!agentFolderId) {
        agentFolderId = await findOrCreateFolder(drive, agentName, rootFolderId)
        agentFoldersCache.set(agentName, agentFolderId)
      }

      for (const prop of agentProps) {
        const propId = (prop as { id: unknown }).id
        const propIdStr = String(propId)
        const resolvedLocation = await extractLocation(prop)
        const folderName = buildFolderName(prop, resolvedLocation)
        const existing = globalDriveProps.get(propIdStr)

        let propFolderId: string
        if (existing) {
          propFolderId = existing.folderId
          if (existing.parentFolderId !== agentFolderId) {
            await drive.files.update({ fileId: existing.folderId, addParents: agentFolderId, removeParents: existing.parentFolderId })
            existing.parentFolderId = agentFolderId
          }
          if (existing.name !== folderName) {
            await drive.files.update({ fileId: existing.folderId, requestBody: { name: folderName } })
            existing.name = folderName
          }
          if (mode === 'folders') continue
        } else {
          progress.current++
          await log(`Creando carpeta: ${folderName}`)
          propFolderId = await findOrCreateFolder(drive, folderName, agentFolderId)
          progress.counts.created++
          globalDriveProps.set(propIdStr, { folderId: propFolderId, parentFolderId: agentFolderId, name: folderName })
        }

        if ((mode === 'files' || mode === 'classify') && session) {
          try {
            const files = await session.getPropertyFiles(propId as string | number)
            for (const file of files) {
              try {
                const buffer = await session.downloadFile(file.url)
                let uploadName = file.name
                if (mode === 'classify') {
                  const result = await classifyFile(file.name, buffer)
                  uploadName = result.nombre_sugerido
                  progress.counts.classified++
                }
                const uploadedId = await uploadFile(drive, uploadName, buffer, null, propFolderId)
                if (uploadedId) {
                  progress.counts.uploaded++
                  await log(`✓ Subido: ${uploadName}`)
                }
              } catch (fileErr) {
                await log(`Error con ${file.name}: ${(fileErr as Error).message}`)
              }
            }
          } catch (filesErr) {
            await log(`Error archivos propiedad ${propIdStr}: ${(filesErr as Error).message}`)
          }
        }
      }
    }

    progress.state = 'done'
    progress.message = 'Sincronización completada'
    await flush(true)
    return new Response('done')
  } catch (err) {
    progress.state = 'error'
    progress.error = (err as Error).message
    progress.message = `Error: ${(err as Error).message}`
    await flush(true)
    return new Response(`error: ${(err as Error).message}`, { status: 500 })
  }
}

export default handler
