import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

export async function POST(req: Request) {
  try {
    const { email, accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const apiKey = getZernioKeyForUser(email || 'default@freire.com');
    const client = new Zernio({ apiKey });

    // Use the SDK to delete/disconnect the account
    await client.accounts.deleteAccount({ id: accountId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Social Disconnect Error:', error);
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode || 500 }
    );
  }
}
