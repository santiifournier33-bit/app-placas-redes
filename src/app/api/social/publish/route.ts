import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';

/**
 * POST /api/social/publish
 * Envía el contenido a las redes sociales usando Zernio.
 */
export async function POST(req: Request) {
  try {
    const { email, text, mediaUrls, socialAccountIds, profileId } = await req.json();

    if (!text && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json({ error: 'Text or media is required' }, { status: 400 });
    }

    const apiKey = getZernioKeyForUser(email || 'default@freire.com');

    // Construir Payload para Zernio
    const payload: any = {
      text,
      socialAccountIds: socialAccountIds || [],
    };

    if (profileId) {
      payload.profileId = profileId;
    }

    if (mediaUrls && mediaUrls.length > 0) {
      // Zernio uses direct arrays of URLs for auto-downloading media
      payload.mediaUrls = mediaUrls;
    }

    const response = await fetch('https://zernio.com/api/v1/post', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to publish via Zernio', 
        details: data 
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Social Publish Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
