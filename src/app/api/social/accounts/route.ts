import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

/**
 * GET /api/social/accounts?email=...
 * Lists the connected social media accounts for this user via the Zernio SDK.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'default@freire.com';

    const apiKey = getZernioKeyForUser(email);
    const client = new Zernio({ apiKey });

    // Find the profile for this user
    const profilesRes = await client.profiles.listProfiles();
    const profiles = profilesRes.data?.profiles || [];
    const profile = profiles.find((p: any) => p.name === email);
    const profileId = profile?._id || profile?.id;

    // List accounts, filtered by profile if available
    const accountsRes = await client.accounts.listAccounts(
      profileId ? { query: { profileId } } : undefined
    );
    const accounts = (accountsRes.data as any)?.accounts || [];

    // Normalize to a simple shape for the frontend
    const normalized = accounts
      .filter((acc: any) => {
        // Ignoramos cuentas que Zernio marca como desconectadas, expiradas o con error
        const s = (acc.status || "").toLowerCase();
        return s !== 'disconnected' && s !== 'error' && s !== 'unauthorized' && s !== 'expired' && s !== 'pending';
      })
      .map((acc: any) => ({
        id: acc._id || acc.id,
        platform: capitalize(acc.platform),
        name: acc.username || acc.displayName || acc.platform,
        username: acc.username,
        profilePicture: acc.profilePicture,
        profileId: acc.profileId,
        status: acc.status || "active",
      }));

    return NextResponse.json({ data: normalized });
  } catch (error: any) {
    console.error('Social Accounts Error:', error);
    return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
