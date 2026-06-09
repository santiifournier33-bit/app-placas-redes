/**
 * Tokko Broker panel scraper for the SYNC (write) path — native `fetch`.
 *
 * Port of `tokko-drive-sync/src/tokko-http.js` (axios + cookie jar) to native
 * fetch with a minimal manual cookie jar, so it bundles into serverless.
 * Flow: login (CSRF + session cookie) → list a property's files → download.
 */

import * as cheerio from 'cheerio'

const TOKKO_URL = 'https://www.tokkobroker.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface TokkoFile {
  id: string
  name: string
  url: string
}

/** A scraping session holding the cookie jar for one Tokko login. */
export class TokkoSession {
  private cookies = new Map<string, string>()
  private loggedIn = false

  private mergeSetCookies(res: Response) {
    // Node 20 / undici exposes getSetCookie(); fall back to single header.
    const getSetCookie = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie
    const list =
      typeof getSetCookie === 'function'
        ? getSetCookie.call(res.headers)
        : ([res.headers.get('set-cookie')].filter(Boolean) as string[])
    for (const raw of list) {
      const pair = raw.split(';')[0]
      const eq = pair.indexOf('=')
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  async login(email: string, password: string): Promise<void> {
    if (this.loggedIn && this.cookies.has('sessionid')) return

    // Step 1: GET login page → CSRF token + csrftoken cookie
    const loginPage = await fetch(`${TOKKO_URL}/login/`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    this.mergeSetCookies(loginPage)
    const $ = cheerio.load(await loginPage.text())
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').attr('value')
    if (!csrfToken) throw new Error('No se encontró csrfmiddlewaretoken en el login de Tokko.')

    // Step 2: POST credentials (redirect:manual to capture sessionid on the 302)
    const form = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      username: email,
      password,
    })
    const loginRes = await fetch(`${TOKKO_URL}/login/?next=/home`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${TOKKO_URL}/login/`,
        Cookie: this.cookieHeader(),
      },
      body: form.toString(),
    })
    this.mergeSetCookies(loginRes)

    if (!this.cookies.has('sessionid')) {
      throw new Error(
        `Login fallido para ${email}: no se obtuvo cookie 'sessionid'. Verificá TOKKO_EMAIL/TOKKO_PASSWORD.`,
      )
    }
    this.loggedIn = true
  }

  async getPropertyFiles(propertyId: string | number): Promise<TokkoFile[]> {
    const url = `${TOKKO_URL}/multiuploader/main/${propertyId}/?type=files&get_files=true`
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: `${TOKKO_URL}/property/${propertyId}/`,
        Cookie: this.cookieHeader(),
      },
    })
    if (!res.ok) throw new Error(`getPropertyFiles ${propertyId}: HTTP ${res.status}`)

    const data: unknown = await res.json().catch(() => null)
    let arr: Array<Record<string, unknown>> = []
    if (Array.isArray(data)) arr = data as Array<Record<string, unknown>>
    else if (data && Array.isArray((data as { files?: unknown }).files)) arr = (data as { files: Array<Record<string, unknown>> }).files
    else if (data && Array.isArray((data as { objects?: unknown }).objects)) arr = (data as { objects: Array<Record<string, unknown>> }).objects
    else return []

    return arr
      .filter((f) => f.id && (f.name || f.filename) && (f.url || f.file_url || f.download_url))
      .map((f) => {
        const raw = String(f.url || f.file_url || f.download_url || '')
        return {
          id: String(f.id),
          name: String(f.name || f.filename),
          url: raw.startsWith('http') ? raw : `${TOKKO_URL}${raw}`,
        }
      })
  }

  async downloadFile(fileUrl: string): Promise<Buffer> {
    const res = await fetch(fileUrl, {
      headers: { 'User-Agent': USER_AGENT, Cookie: this.cookieHeader() },
    })
    if (!res.ok) throw new Error(`downloadFile: HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
}
