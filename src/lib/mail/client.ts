import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';

export interface MailCredentials {
  user: string;
  pass: string;
}

const IMAP_HOST = 'mail.freirepropiedades.com';
const IMAP_PORT = 993;
const SMTP_PORT = 465;

export async function getImapClient(creds: MailCredentials) {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    tls: {
      rejectUnauthorized: false // DonWeb usa un certificado *.ferozo.com que da error con mail.freirepropiedades.com
    },
    auth: {
      user: creds.user,
      pass: creds.pass
    },
    logger: false // Desactivamos los logs internos para no ensuciar la consola
  });

  await client.connect();
  return client;
}

export function getSmtpClient(creds: MailCredentials) {
  return nodemailer.createTransport({
    host: IMAP_HOST, // Generalmente DonWeb usa el mismo host
    port: SMTP_PORT,
    secure: true,
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      user: creds.user,
      pass: creds.pass
    }
  });
}

export async function parseEmailBuffer(buffer: Buffer) {
  return await simpleParser(buffer);
}

export async function findMailboxPath(client: ImapFlow, requestedFolder: string): Promise<string> {
  if (requestedFolder === 'INBOX') return 'INBOX';
  
  // Normalize: strip INBOX. prefix so we always work with canonical names
  const canonical = requestedFolder.replace(/^INBOX\./i, '');
  
  try {
    const list = await client.list();
    
    // First try by specialUse flag (e.g. \Sent)
    const specialUseMap: Record<string, string> = {
      'Sent': '\\Sent',
      'Trash': '\\Trash',
      'Drafts': '\\Drafts',
      'Junk': '\\Junk',
      'Spam': '\\Junk',
    };
    const specialFlag = specialUseMap[canonical];
    if (specialFlag) {
      const found = list.find(f => f.specialUse === specialFlag);
      if (found) return found.path;
    }

    // Then try by common names (case insensitive)
    const nameMap: Record<string, string[]> = {
      'Sent': ['Enviados', 'Sent', 'Sent Items', 'Sent Messages', 'Elementos enviados', 'INBOX.Sent', 'INBOX.Enviados', 'INBOX.Sent Items'],
      'Trash': ['Papelera', 'Trash', 'Deleted Items', 'Deleted Messages', 'Elementos eliminados', 'INBOX.Trash', 'INBOX.Papelera', 'INBOX.Deleted Items'],
      'Drafts': ['Borradores', 'Drafts', 'Draft', 'INBOX.Drafts', 'INBOX.Borradores'],
      'Junk': ['Spam', 'Junk', 'Junk E-mail', 'Correo no deseado', 'INBOX.Junk', 'INBOX.Spam'],
    };
    
    const fallbacks = nameMap[canonical] || [canonical, `INBOX.${canonical}`, requestedFolder];
    const found = list.find(f => 
      fallbacks.some(fb => f.name.toLowerCase() === fb.toLowerCase() || f.path.toLowerCase() === fb.toLowerCase())
    );
    
    if (found) return found.path;

    // Last resort: try the raw input directly
    const directMatch = list.find(f => f.path.toLowerCase() === requestedFolder.toLowerCase());
    if (directMatch) return directMatch.path;

    // Return raw — the server will error if it doesn't exist
    console.warn(`[Mail] Carpeta no encontrada: ${requestedFolder}. Disponibles: ${list.map(f => f.path).join(', ')}`);
    return requestedFolder;
  } catch (err) {
    console.error("Error finding mailbox:", err);
    return requestedFolder;
  }
}
