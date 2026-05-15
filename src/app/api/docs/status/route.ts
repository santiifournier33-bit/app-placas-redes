/**
 * GET /api/docs/status
 * Returns full documentation status: properties from Tokko × files from Drive.
 * Admin-only (middleware already handles auth).
 */

import { NextResponse } from 'next/server'
import { buildFullStatus } from '@/lib/docs/doc-analyzer'
import {
  getTokkoModule,
  getDriveModule,
  getSyncConfig,
} from '@/lib/docs/sync-bridge'

// ── Cache ──
let cachedStatus: ReturnType<typeof buildFullStatus> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ── Types ──
interface DriveFileRaw {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime?: string
  webViewLink?: string
}

interface AgentDriveData {
  agentName: string
  agentFolderId: string
  properties: Map<string, {
    id: string
    name: string
    files: DriveFileRaw[]
  }>
}

interface DriveClient {
  files: {
    list: (opts: Record<string, unknown>) => Promise<{
      data: { files: DriveFileRaw[]; nextPageToken?: string }
    }>
  }
}

// ── Fetch all Drive data ──
async function getDriveTree(
  driveClient: DriveClient,
  rootFolderId: string,
): Promise<AgentDriveData[]> {
  const result: AgentDriveData[] = []

  // 1. List agent folders under root
  const agentFoldersRes = await driveClient.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 100,
  })
  const agentFolders = agentFoldersRes.data.files || []

  for (const agentFolder of agentFolders) {
    const agentData: AgentDriveData = {
      agentName: agentFolder.name,
      agentFolderId: agentFolder.id,
      properties: new Map(),
    }

    // 2. List property folders under each agent
    let pageToken: string | undefined
    do {
      const propFoldersRes = await driveClient.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and '${agentFolder.id}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name)',
        pageSize: 1000,
        pageToken,
      })
      const propFolders = propFoldersRes.data.files || []

      for (const propFolder of propFolders) {
        const propId = propFolder.name.split(' - ')[0]?.trim()
        if (!propId || !/^\d+$/.test(propId)) continue

        // 3. List files inside each property folder
        const filesRes = await driveClient.files.list({
          q: `'${propFolder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
          fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
          pageSize: 100,
        })

        agentData.properties.set(propId, {
          id: propFolder.id,
          name: propFolder.name,
          files: filesRes.data.files || [],
        })
      }

      pageToken = propFoldersRes.data.nextPageToken
    } while (pageToken)

    result.push(agentData)
  }

  return result
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Return cached data if fresh and not forced
    if (!force && cachedStatus && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ ...cachedStatus, cached: true })
    }

    const config = getSyncConfig()
    const tokko = getTokkoModule()
    const drive = getDriveModule()

    if (!config.tokkoApiKey) {
      return NextResponse.json({ error: 'TOKKO_API_KEY no configurada' }, { status: 500 })
    }
    if (!config.rootFolderId) {
      return NextResponse.json({ error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado' }, { status: 500 })
    }

    // Fetch Tokko properties and Drive tree in parallel
    const [properties, driveClient] = await Promise.all([
      tokko.getAllProperties(config.tokkoApiKey),
      drive.getDrive(config.oauthClientPath),
    ])

    const driveTree = await getDriveTree(driveClient, config.rootFolderId)

    // Build full status
    const status = buildFullStatus(properties, driveTree)

    cachedStatus = status
    cacheTimestamp = Date.now()

    return NextResponse.json({ ...status, cached: false })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in /api/docs/status:', message)
    return NextResponse.json({ error: `Error al obtener estado de documentación: ${message}` }, { status: 500 })
  }
}
