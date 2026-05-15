import { NextResponse } from 'next/server';
import { getImapClient } from '@/lib/mail/client';

export async function POST(req: Request) {
  try {
    const { user, pass } = await req.json();
    if (!user || !pass) return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 });

    const client = await getImapClient({ user, pass });
    
    // Si llegamos aquí, la conexión fue exitosa
    await client.logout();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mail login error:', error);
    return NextResponse.json({ error: 'Credenciales inválidas o error de conexión' }, { status: 401 });
  }
}
