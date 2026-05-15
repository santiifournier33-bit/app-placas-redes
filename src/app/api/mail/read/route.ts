import { NextResponse } from 'next/server';
import { getImapClient, parseEmailBuffer, findMailboxPath } from '@/lib/mail/client';
import DOMPurify from 'isomorphic-dompurify';
import { AddressObject } from 'mailparser';

export async function POST(req: Request) {
  try {
    const { user, pass, folder = 'INBOX', uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Falta UID' }, { status: 400 });

    const client = await getImapClient({ user, pass });
    
    const actualFolder = await findMailboxPath(client, folder);
    let lock = await client.getMailboxLock(actualFolder);
    try {
      // Fetch full source
      let sourceBuffer: Buffer | null = null;
      const message = await client.fetchOne(uid, { source: true, flags: true }, { uid: true });
      
      if (!message || !message.source) {
        return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
      }

      const parsed = await parseEmailBuffer(message.source);
      
      // Sanitizar HTML para evitar XSS
      const cleanHtml = parsed.html ? DOMPurify.sanitize(parsed.html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target'] // Permitir target="_blank"
      }) : null;

      // Ensure links open in new tab
      const htmlWithBlankTargets = cleanHtml ? cleanHtml.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') : null;

      const normalizeAddr = (addr: any) => {
        if (!addr) return undefined;
        const obj = Array.isArray(addr) ? addr[0] : addr;
        return obj?.value;
      };

      return NextResponse.json({ 
        uid: message.uid,
        flags: Array.from(message.flags || []),
        subject: parsed.subject,
        from: normalizeAddr(parsed.from),
        to: normalizeAddr(parsed.to),
        cc: normalizeAddr(parsed.cc),
        date: parsed.date,
        text: parsed.text,
        html: htmlWithBlankTargets,
        attachments: parsed.attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          // Convertimos el buffer a base64 para enviarlo al cliente
          content: att.content.toString('base64')
        }))
      });
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (error: any) {
    console.error('Mail read error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
