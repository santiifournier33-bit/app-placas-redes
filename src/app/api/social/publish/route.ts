import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

/**
 * POST /api/social/publish
 * Publishes content to social media via the Zernio SDK.
 */
export async function POST(req: Request) {
  try {
    const { email, text, mediaUrls, socialAccountIds, profileId } = await req.json();

    if (!text && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json({ error: 'Text or media is required' }, { status: 400 });
    }

    const apiKey = getZernioKeyForUser(email || 'default@freire.com');
    const client = new Zernio({ apiKey });

    // Build platforms array from socialAccountIds
    // The Zernio SDK posts.createPost expects { body: { ... } }
    const body: any = {};

    if (text) {
      body.post = text;
    }

    if (mediaUrls && mediaUrls.length > 0) {
      body.mediaUrls = mediaUrls;
    }

    if (socialAccountIds && socialAccountIds.length > 0) {
      body.socialAccountIds = socialAccountIds;
    }

    if (profileId) {
      body.profileId = profileId;
    }

    // Use the SDK to create a post
    const postRes = await client.posts.createPost({ body });
    const data = postRes.data || postRes;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Social Publish Error:', error);
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode || 500 }
    );
  }
}
