import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

// Token opaco "modo colegas": cifra el id Tokko con AES-256-GCM para que la URL
// pública (/ficha/[token]) no exponga ni permita enumerar el id real de la propiedad,
// evitando que un colega puentee la operación. Stateless: no requiere tabla en DB.
//
// Formato del token (base64url): iv(12) || authTag(16) || ciphertext.

const ALG = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

class ColegaSecretError extends Error {
  constructor() {
    super('Falta configuración de COLEGA_LINK_SECRET')
    this.name = 'ColegaSecretError'
  }
}

/** Deriva una clave de 32 bytes desde COLEGA_LINK_SECRET (cualquier longitud). */
function getKey(): Buffer {
  const secret = process.env.COLEGA_LINK_SECRET
  if (!secret) throw new ColegaSecretError()
  return createHash('sha256').update(secret).digest()
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Buffer {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/** Firma/cifra un id Tokko en un token opaco base64url. Lanza si falta el secreto. */
export function signColegaToken(tokkoId: string | number): string {
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv)
  const ciphertext = Buffer.concat([cipher.update(String(tokkoId), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return toBase64Url(Buffer.concat([iv, tag, ciphertext]))
}

/**
 * Verifica/descifra un token. Devuelve el id Tokko (number) o null si el token es
 * inválido, fue manipulado, o falta el secreto. Nunca lanza (uso en rutas públicas).
 */
export function verifyColegaToken(token: string): number | null {
  try {
    const key = getKey()
    const raw = fromBase64Url(token)
    if (raw.length <= IV_LEN + TAG_LEN) return null
    const iv = raw.subarray(0, IV_LEN)
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
    const ciphertext = raw.subarray(IV_LEN + TAG_LEN)
    const decipher = createDecipheriv(ALG, key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    const id = Number(plain)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}
