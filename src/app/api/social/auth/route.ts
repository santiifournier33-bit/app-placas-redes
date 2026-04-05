import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';

/**
 * GET /api/social/auth
 * Generates an OAuth linking portal URL using the user's mapped Zernio API Key.
 * This ensures the agent can securely connect their Instagram/Facebook without
 * needing the master API keys or passwords.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'default@freire.com';
    
    const apiKey = getZernioKeyForUser(email);
    
    // In a real scenario for Ayrshare/Zernio, this calls the Generate JWT/OAuth Link endpoint.
    // e.g. POST https://app.ayrshare.com/api/profiles/generateJWT 
    // For this mockup, we'll simulate the response.
    
    /* 
    const response = await fetch('https://zernio.com/api/v1/auth/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profileId: email })
    });
    const data = await response.json();
    return NextResponse.json({ url: data.url });
    */

    // Simulated successful link generation:
    const mockAuthUrl = `https://mock-oauth-portal.zernio.com/connect?token=${Buffer.from(apiKey).toString('base64').substring(0,10)}&user=${encodeURIComponent(email)}`;
    
    return NextResponse.json({ url: mockAuthUrl });
  } catch (error: any) {
    console.error('Social Auth Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
