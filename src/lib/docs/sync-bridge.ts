/**
 * Bridge between Next.js API routes and tokko-drive-sync CommonJS modules.
 * Uses eval('require') to completely bypass webpack's static analysis.
 * These modules only run server-side in API routes.
 */

import path from 'path'

const SYNC_ROOT = path.join(process.cwd(), 'tokko-drive-sync')
const SYNC_SRC = path.join(SYNC_ROOT, 'src')
const SYNC_ENV = path.join(SYNC_ROOT, '.env')
const OAUTH_CLIENT = path.join(SYNC_ROOT, 'oauth-client.json')

// Completely bypass webpack static analysis
// eslint-disable-next-line no-eval
const dynamicRequire = eval('require') as NodeRequire

let envLoaded = false

/**
 * Load environment variables from tokko-drive-sync/.env
 */
export function loadSyncEnv() {
  if (envLoaded) return
  dynamicRequire('dotenv').config({ path: SYNC_ENV })
  envLoaded = true
}

/**
 * Get Tokko API module (tokko.js)
 */
export function getTokkoModule() {
  return dynamicRequire(path.join(SYNC_SRC, 'tokko.js'))
}

/**
 * Get Google Drive module (drive.js)
 */
export function getDriveModule() {
  return dynamicRequire(path.join(SYNC_SRC, 'drive.js'))
}

/**
 * Get Tokko HTTP scraper module (tokko-http.js)
 */
export function getTokkoHttpModule() {
  return dynamicRequire(path.join(SYNC_SRC, 'tokko-http.js'))
}

/**
 * Get location extraction module (location.js)
 */
export function getLocationModule() {
  return dynamicRequire(path.join(SYNC_SRC, 'location.js'))
}

/**
 * Get classifier module (classifier.js)
 */
export function getClassifierModule() {
  return dynamicRequire(path.join(SYNC_SRC, 'classifier.js'))
}

/**
 * Get OAuth client path for Google Drive
 */
export function getOAuthClientPath() {
  return OAUTH_CLIENT
}

/**
 * Get configured env values
 */
export function getSyncConfig() {
  loadSyncEnv()
  return {
    tokkoApiKey: process.env.TOKKO_API_KEY || '',
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
    tokkoEmail: process.env.TOKKO_EMAIL || '',
    tokkoPassword: process.env.TOKKO_PASSWORD || '',
    oauthClientPath: OAUTH_CLIENT,
  }
}
