/**
 * GET /api/docs/property/[id]
 * Returns detailed documentation for a specific property.
 */

import { NextResponse } from 'next/server'
import { analyzePropertyDocs } from '@/lib/docs/doc-analyzer'
import { getDriveModule, getSyncConfig } from '@/lib/docs/sync-bridge'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const config = getSyncConfig()
    const drive = getDriveModule()

    if (!config.rootFolderId) {
      return NextResponse.json({ error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado' }, { status: 500 })
    }

    const driveClient = await drive.getDrive(config.oauthClientPath)

    // Search for property folder across all agent folders
    const agentFoldersRes = await driveClient.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and '${config.rootFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 100,
    })

    let propertyFolder: { id: string; name: string } | null = null
    let agentName = ''

    for (const agentFolder of (agentFoldersRes.data.files || [])) {
      const propRes = await driveClient.files.list({
        q: `name contains '${id}' and mimeType='application/vnd.google-apps.folder' and '${agentFolder.id}' in parents and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 1,
      })

      if (propRes.data.files?.length > 0) {
        propertyFolder = propRes.data.files[0]
        agentName = agentFolder.name
        break
      }
    }

    if (!propertyFolder) {
      return NextResponse.json({
        id,
        status: 'unsynced',
        files: [],
        message: 'No se encontró carpeta en Drive para esta propiedad',
      })
    }

    // Get files in property folder
    const filesRes = await driveClient.files.list({
      q: `'${propertyFolder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
      pageSize: 100,
    })

    const files = filesRes.data.files || []

    // Determine operation from folder name
    const parts = propertyFolder.name.split(' - ')
    const operationType = parts[1]?.split(' ')[0] || 'Venta'

    const analysis = analyzePropertyDocs(files, operationType)

    return NextResponse.json({
      id,
      agent: agentName,
      folderName: propertyFolder.name,
      folderId: propertyFolder.id,
      driveUrl: `https://drive.google.com/drive/folders/${propertyFolder.id}`,
      ...analysis,
      fileCount: files.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in /api/docs/property/[id]:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
