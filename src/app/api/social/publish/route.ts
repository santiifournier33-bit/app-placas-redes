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
    const body: any = {};

    if (text) {
      body.post = text;
    }

    if (mediaUrls && mediaUrls.length > 0) {
      // Process Data URIs into tmpfiles URL so Zernio backend can download it over HTTP
      const processedMedia = [];
      for (const m of mediaUrls) {
        if (m.startsWith('data:image/')) {
          try {
            const base64Data = m.split(',')[1];
            const mimeMatch = m.match(/^data:(image\/\w+);base64,/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: mime });
            const formData = new FormData();
            formData.append('file', blob, 'placa.jpg');

            const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
              method: 'POST',
              body: formData
            });
            const d = await uploadRes.json();
            if (d?.data?.url) {
              // Convert to direct download link
              processedMedia.push(d.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/'));
            } else {
              processedMedia.push(m);
            }
          } catch (e) {
            console.error("Failed to upload base64 to tmpfiles:", e);
            processedMedia.push(m);
          }
        } else {
          processedMedia.push(m);
        }
      }
      body.mediaUrls = processedMedia;
    }

    if (socialAccountIds && socialAccountIds.length > 0) {
      // Fetch accounts to get their platforms so we can format them for Zernio's API
      const pId = profileId ? { query: { profileId } } : undefined;
      const accountsRes = await client.accounts.listAccounts(pId);
      const accounts = (accountsRes.data as any)?.accounts || [];

      // Zernio expects `platforms: [{ platform: 'instagram', accountId: '...' }]` 
      // instead of raw `socialAccountIds` in many recent SDK versions
      const platforms = [];
      for (const id of socialAccountIds) {
        const found = accounts.find((a: any) => a._id === id || a.id === id);
        if (found) {
          platforms.push({ platform: found.platform, accountId: id });
        } else {
          // fallback
          platforms.push({ platform: 'instagram', accountId: id });
        }
      }
      body.platforms = platforms;
      
      // Keep old property just in case older SDK version prefers it
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
