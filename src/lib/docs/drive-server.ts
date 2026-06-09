/**
 * Native Google Drive clients for the documentation module.
 *
 * Runs inside Next.js API routes / Netlify functions (Node runtime) on both
 * local and serverless — unlike the local-only `tokko-drive-sync` bridge, this
 * imports `googleapis` statically so Netlify's dependency tracer bundles it.
 *
 * Credentials come from env vars (no files, no `.env` on disk):
 *  - READ  (`getDriveReadonly`): service account from `GOOGLE_SERVICE_ACCOUNT_JSON`,
 *    falling back to the user OAuth token if the SA key is missing/invalid.
 *  - WRITE (`getDriveWrite`): user OAuth from `GOOGLE_OAUTH_CLIENT_JSON` +
 *    `GOOGLE_OAUTH_REFRESH_TOKEN` (service accounts can't write to a personal My Drive).
 */

import { google, type drive_v3 } from 'googleapis'

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>

let _driveRO: drive_v3.Drive | null = null
let _driveRW: drive_v3.Drive | null = null

/** Decode an env value that is either raw JSON or base64-encoded JSON. */
function decodeJsonEnv(value: string): Record<string, unknown> {
  const text = value.trim().startsWith('{') ? value : Buffer.from(value, 'base64').toString('utf8')
  return JSON.parse(text)
}

/** Drive root folder id from env. */
export function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!id) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado')
  return id
}

/** Build an OAuth2 client from env (client json + refresh token). */
function buildOAuthClient(): OAuth2Client {
  const clientJson = process.env.GOOGLE_OAUTH_CLIENT_JSON
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!clientJson || !refreshToken) {
    throw new Error('GOOGLE_OAUTH_CLIENT_JSON / GOOGLE_OAUTH_REFRESH_TOKEN no configurados')
  }
  const creds = decodeJsonEnv(clientJson)
  const inner = (creds.installed || creds.web) as { client_id: string; client_secret: string }
  const oauth2 = new google.auth.OAuth2(inner.client_id, inner.client_secret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  return oauth2
}

/**
 * Read-only Drive client.
 * Prefers the service account; falls back to user OAuth if the SA key is
 * missing or invalid (e.g. revoked/rotated), so reads keep working.
 */
export async function getDriveReadonly(): Promise<drive_v3.Drive> {
  if (_driveRO) return _driveRO

  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (saJson) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: decodeJsonEnv(saJson),
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      })
      const client = await auth.getClient()
      // Force the JWT exchange so an invalid key fails here, not mid-request.
      await client.getAccessToken()
      _driveRO = google.drive({ version: 'v3', auth })
      return _driveRO
    } catch (err) {
      console.warn('[docs] Service account auth failed, falling back to OAuth:', (err as Error).message)
    }
  }

  _driveRO = google.drive({ version: 'v3', auth: buildOAuthClient() })
  return _driveRO
}

/** Read-write Drive client via user OAuth (used by the sync/write path). */
export function getDriveWrite(): drive_v3.Drive {
  if (_driveRW) return _driveRW
  _driveRW = google.drive({ version: 'v3', auth: buildOAuthClient() })
  return _driveRW
}
