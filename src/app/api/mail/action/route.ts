import { NextResponse } from 'next/server';
import { getImapClient, findMailboxPath } from '@/lib/mail/client';

/**
 * POST /api/mail/action
 * Body: { user, pass, folder, uids: number[], action: string, target?: string }
 * 
 * Actions:
 *  - markRead / markUnread
 *  - delete (move to Trash)
 *  - spam (move to Junk)
 *  - archive (remove from INBOX, or delete if not INBOX)
 *  - move (requires target folder)
 *  - star / unstar
 */
export async function POST(req: Request) {
  try {
    const { user, pass, folder = 'INBOX', uids, action, target } = await req.json();
    if (!uids?.length || !action) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const client = await getImapClient({ user, pass });
    const actualFolder = await findMailboxPath(client, folder);
    let lock = await client.getMailboxLock(actualFolder);

    try {
      const uidSet = uids.join(',');

      switch (action) {
        case 'markRead':
          await client.messageFlagsAdd(uidSet, ['\\Seen'], { uid: true });
          break;

        case 'markUnread':
          await client.messageFlagsRemove(uidSet, ['\\Seen'], { uid: true });
          break;

        case 'star':
          await client.messageFlagsAdd(uidSet, ['\\Flagged'], { uid: true });
          break;

        case 'unstar':
          await client.messageFlagsRemove(uidSet, ['\\Flagged'], { uid: true });
          break;

        case 'delete': {
          const trashPath = await findMailboxPath(client, 'Trash');
          if (actualFolder === trashPath) {
            // Already in Trash — permanently delete
            await client.messageFlagsAdd(uidSet, ['\\Deleted'], { uid: true });
            await client.messageDelete(uidSet, { uid: true });
          } else {
            await client.messageMove(uidSet, trashPath, { uid: true });
          }
          break;
        }

        case 'spam': {
          const junkPath = await findMailboxPath(client, 'Junk');
          await client.messageMove(uidSet, junkPath, { uid: true });
          break;
        }

        case 'archive': {
          // Archive = move to "All Mail" or just delete from INBOX
          // DonWeb doesn't have "All Mail", so we move to Trash if not INBOX
          if (actualFolder === 'INBOX') {
            const trashPath = await findMailboxPath(client, 'Trash');
            await client.messageMove(uidSet, trashPath, { uid: true });
          }
          break;
        }

        case 'move': {
          if (!target) return NextResponse.json({ error: 'Falta carpeta destino' }, { status: 400 });
          const targetPath = await findMailboxPath(client, target);
          await client.messageMove(uidSet, targetPath, { uid: true });
          break;
        }

        default:
          return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (error: any) {
    console.error('Mail action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
