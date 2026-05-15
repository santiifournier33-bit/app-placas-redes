import { NextResponse } from 'next/server';
import { getImapClient, findMailboxPath } from '@/lib/mail/client';

export async function POST(req: Request) {
  try {
    const { user, pass, folder = 'INBOX', page = 1, limit = 20 } = await req.json();
    const client = await getImapClient({ user, pass });
    
    const actualFolder = await findMailboxPath(client, folder);
    let lock = await client.getMailboxLock(actualFolder);
    try {
      const status = await client.status(actualFolder, { messages: true });
      const totalMessages = status.messages ?? 0;
      
      if (totalMessages === 0) {
        return NextResponse.json({ messages: [], total: 0 });
      }

      // Calculate range
      const start = Math.max(1, totalMessages - (page * limit) + 1);
      const end = totalMessages - ((page - 1) * limit);
      const seq = `${start}:${end}`;

      const messages = [];
      for await (let msg of client.fetch(seq, { envelope: true, flags: true, source: false })) {
        messages.push({
          uid: msg.uid,
          seq: msg.seq,
          flags: Array.from(msg.flags || []),
          date: msg.envelope?.date,
          subject: msg.envelope?.subject ?? '(Sin asunto)',
          from: msg.envelope?.from ?? [],
          to: msg.envelope?.to ?? [],
          messageId: msg.envelope?.messageId,
          inReplyTo: msg.envelope?.inReplyTo,
        });
      }

      // Sort descending (newest first)
      messages.sort((a, b) => b.seq - a.seq);

      return NextResponse.json({ 
        messages, 
        total: totalMessages,
        page,
        limit
      });
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (error: any) {
    console.error('Mail messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
