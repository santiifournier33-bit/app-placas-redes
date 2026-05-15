import { NextResponse } from 'next/server';
import { getImapClient } from '@/lib/mail/client';

export async function POST(req: Request) {
  try {
    const { user, pass } = await req.json();
    const client = await getImapClient({ user, pass });
    
    const folders = await client.list();
    await client.logout();
    
    return NextResponse.json({ folders: folders.map(f => ({ path: f.path, name: f.name })) });
  } catch (error: any) {
    console.error('Mail folders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
