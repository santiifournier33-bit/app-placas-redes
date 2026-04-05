import crypto from "crypto";

export interface ZernioUserContext {
  token: string;
  assignedKeyIndex: number; 
}

const ZERNIO_KEYS = [
  process.env.ZERNIO_API_KEY_1,
  process.env.ZERNIO_API_KEY_2,
  process.env.ZERNIO_API_KEY_3,
  process.env.ZERNIO_API_KEY_4,
].filter(Boolean) as string[];

/**
 * Mapea consistentemente a un asesor (por email) hacia una de las 4 llaves maestras
 * para no exceder los límites de Zernio (2 usuarios por llave).
 * Al haber 4 llaves, tenemos capacidad para 8 asesores, lo que cubre los 6 actuales.
 */
export function getZernioKeyForUser(email: string): string {
  if (ZERNIO_KEYS.length === 0) {
    throw new Error("No Zernio API Keys configured");
  }
  
  // Create a consistent hash from the email to always assign them the same key
  const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
  const numericHash = parseInt(hash.substring(0, 8), 16);
  
  const keyIndex = numericHash % ZERNIO_KEYS.length;
  return ZERNIO_KEYS[keyIndex];
}
