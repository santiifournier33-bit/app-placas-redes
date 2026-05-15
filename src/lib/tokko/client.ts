import type { TokkoUser, TokkoUserListResponse } from './types'

const TOKKO_API_KEY = process.env.TOKKO_API_KEY!
const TOKKO_BASE_URL = 'https://www.tokkobroker.com/api/v1'

export async function listTokkoUsers(): Promise<TokkoUser[]> {
  const users: TokkoUser[] = []
  let url: string | null = `${TOKKO_BASE_URL}/user/?key=${TOKKO_API_KEY}&format=json&limit=100`

  while (url) {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      throw new Error(`Tokko API error: ${res.status} ${res.statusText}`)
    }

    const data: TokkoUserListResponse = await res.json()
    users.push(...data.objects)
    url = data.next
  }

  return users
}

export async function getTokkoUserByEmail(email: string): Promise<TokkoUser | null> {
  const users = await listTokkoUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

export async function isTokkoUserActive(email: string): Promise<boolean> {
  const user = await getTokkoUserByEmail(email)
  return user?.is_active ?? false
}

export async function validateTokkoCredentials(
  email: string,
  password: string
): Promise<{ success: true } | { success: false; error: string }> {
  const initialRes = await fetch('https://www.tokkobroker.com/go/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3',
    },
    signal: AbortSignal.timeout(10_000),
  })

  const setCookieHeader = initialRes.headers.get('set-cookie')
  if (!setCookieHeader) {
    return { success: false, error: 'No se pudo inicializar la sesión con Tokko' }
  }

  const match = setCookieHeader.match(/csrftoken=([^;]+)/)
  const csrftoken = match?.[1]
  if (!csrftoken) {
    return { success: false, error: 'No se obtuvo token de seguridad de Tokko' }
  }

  const formData = new URLSearchParams()
  formData.append('username', email)
  formData.append('password', password)
  formData.append('csrfmiddlewaretoken', csrftoken)
  formData.append('next', '/home')

  const loginRes = await fetch('https://www.tokkobroker.com/login/?next=/home', {
    method: 'POST',
    body: formData.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Referer': 'https://www.tokkobroker.com/go/',
      'Origin': 'https://www.tokkobroker.com',
      'Cookie': `csrftoken=${csrftoken}`,
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  })

  const location = loginRes.headers.get('location')
  if (loginRes.status === 302 && location?.includes('/home') && !location.includes('/invalid_login/')) {
    return { success: true }
  }

  return { success: false, error: 'Las credenciales ingresadas son incorrectas.' }
}
