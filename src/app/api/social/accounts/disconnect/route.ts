import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

/**
 * POST /api/social/accounts/disconnect
 * Disconnects/deletes a social media account from Zernio.
 * 
 * The Zernio SDK expects: deleteAccount({ path: { accountId } })
 */
export async function POST(req: Request) {
  try {
    const { email, accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const apiKey = getZernioKeyForUser(email || 'default@freire.com');
    const client = new Zernio({ apiKey });

    // Zernio deleteAccount expects { path: { accountId } } NOT { id: accountId }
    await client.accounts.deleteAccount({ path: { accountId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Social Disconnect Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect account', details: error.details },
      { status: error.statusCode || 500 }
    );
  }
}
