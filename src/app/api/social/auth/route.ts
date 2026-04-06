import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

/**
 * GET /api/social/auth?email=...&platform=instagram
 * Generates a real OAuth linking URL using the Zernio SDK.
 * The frontend should redirect the user (or open a popup) to the returned authUrl.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'default@freire.com';
    const platform = (url.searchParams.get('platform') || 'instagram') as any;

    const apiKey = getZernioKeyForUser(email);
    const client = new Zernio({ apiKey });

    // 1. Find or create a profile for this user
    const profilesRes = await client.profiles.listProfiles();
    const profiles = profilesRes.data?.profiles || [];
    let profile = profiles.find((p: any) => p.name === email);

    if (!profile) {
      const createRes = await client.profiles.createProfile({
        body: { name: email },
      });
      profile = (createRes.data as any)?.profile || createRes.data;
    }

    const profileId = profile?._id || profile?.id;
    if (!profileId) {
      return NextResponse.json({ error: 'Could not resolve Zernio profile' }, { status: 500 });
    }

    // 2. Get the OAuth connect URL for the requested platform
    const connectRes = await client.connect.getConnectUrl({
      path: { platform },
      query: {
        profileId,
        redirect_url: `${url.origin}/api/social/callback?email=${encodeURIComponent(email)}`,
      },
    });

    const result = connectRes.data || connectRes;
    const authUrl = (result as any)?.authUrl;

    if (!authUrl) {
      return NextResponse.json({ error: 'Failed to generate auth URL', details: result }, { status: 500 });
    }

    return NextResponse.json({ url: authUrl, profileId });
  } catch (error: any) {
    console.error('Social Auth Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
