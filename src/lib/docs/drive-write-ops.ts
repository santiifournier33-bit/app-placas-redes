/**
 * Drive folder/upload operations for the SYNC (write) path.
 * Port of the folder helpers in `tokko-drive-sync/src/drive.js`.
 */

import { Readable } from 'stream'
import type { drive_v3 } from 'googleapis'

const folderCache = new Map<string, string>()

/** Find a folder by name under parent, or create it (with id-prefix rename support). */
export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string> {
  const cacheKey = `${parentId}::${name}`
  const cached = folderCache.get(cacheKey)
  if (cached) return cached

  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  })
  if (res.data.files && res.data.files.length > 0) {
    const id = res.data.files[0].id!
    folderCache.set(cacheKey, id)
    return id
  }

  // Match an existing folder by property-id prefix and rename if needed.
  const propertyId = name.split(' - ')[0]
  if (propertyId && /^\d+$/.test(propertyId)) {
    const byId = await drive.files.list({
      q: `name contains '${propertyId}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 1,
    })
    const existing = byId.data.files?.[0]
    if (existing) {
      if (existing.name !== name) {
        await drive.files.update({ fileId: existing.id!, requestBody: { name } })
      }
      folderCache.set(cacheKey, existing.id!)
      return existing.id!
    }
  }

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  })
  const id = created.data.id!
  folderCache.set(cacheKey, id)
  return id
}

async function fileExistsInFolder(drive: drive_v3.Drive, fileName: string, folderId: string): Promise<boolean> {
  const res = await drive.files.list({
    q: `name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
  })
  return (res.data.files?.length ?? 0) > 0
}

/** Upload a file unless one with the same name already exists. Returns new id or null. */
export async function uploadFile(
  drive: drive_v3.Drive,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string | null,
  folderId: string,
): Promise<string | null> {
  if (await fileExistsInFolder(drive, fileName, folderId)) return null

  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: mimeType || 'application/octet-stream', body: Readable.from(fileBuffer) },
    fields: 'id, name',
  })
  return res.data.id ?? null
}
