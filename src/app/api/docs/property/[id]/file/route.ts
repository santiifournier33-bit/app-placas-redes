/**
 * GET /api/docs/property/[id]/file?fileId=xxx&action=preview|download
 * Preview or download a file from Google Drive.
 */

import { NextResponse } from 'next/server'
import { getDriveModule, getSyncConfig } from '@/lib/docs/sync-bridge'
import mammoth from 'mammoth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const action = searchParams.get('action') || 'preview'

    if (!fileId) {
      return NextResponse.json({ error: 'fileId requerido' }, { status: 400 })
    }

    const config = getSyncConfig()
    const drive = getDriveModule()
    const driveClient = await drive.getDrive(config.oauthClientPath)

    if (action === 'preview' || action === 'download') {
      // Get file metadata
      const fileMeta = await driveClient.files.get({
        fileId,
        fields: 'name, mimeType',
      })

      // Download file content
      const fileContent = await driveClient.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'arraybuffer' })

      const buffer = Buffer.from(fileContent.data as ArrayBuffer)
      
      const isDocx = fileMeta.data.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      if (action === 'preview' && isDocx) {
        try {
          const result = await mammoth.convertToHtml({ buffer })
          const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1a1a1a; background: #ffffff; line-height: 1.6; }
    img { max-width: 100%; height: auto; display: block; margin: 1rem auto; }
    table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
    td, th { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
    th { background-color: #f9fafb; font-weight: 600; }
    h1, h2, h3, h4 { color: #111827; margin-top: 2rem; margin-bottom: 1rem; }
    p { margin-bottom: 1rem; }
    ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
  </style>
</head>
<body>
  ${result.value}
</body>
</html>`
          
          return new NextResponse(htmlContent, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600',
            },
          })
        } catch (err: unknown) {
          console.error("Error converting DOCX to HTML:", err)
          return NextResponse.json({ error: "No se pudo previsualizar el documento de Word." }, { status: 500 })
        }
      }

      const disposition = action === 'preview' ? 'inline' : 'attachment'

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': fileMeta.data.mimeType || 'application/octet-stream',
          'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileMeta.data.name || 'file')}"`,
          'Content-Length': String(buffer.length),
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    return NextResponse.json({ error: 'action debe ser "preview" o "download"' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in file endpoint:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
