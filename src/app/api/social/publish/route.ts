import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

/**
 * POST /api/social/publish
 * Publishes content to social media via the Zernio SDK.
 * 
 * Accepts:
 *   email            → advisor email for key lookup
 *   text             → post caption/text (omitted for stories)
 *   mediaUrls        → array of public URLs (already uploaded via presigned)
 *   accounts         → array of { id, platform } (avoids extra listAccounts call)
 *   socialAccountIds → DEPRECATED fallback (old format, just IDs)
 *   profileId        → Zernio profile ID
 *   contentFormat    → 'reel' | 'story' | 'post'
 */
export async function POST(req: Request) {
  try {
    const { email, text, mediaUrls, accounts, socialAccountIds, profileId, contentFormat } = await req.json();

    if (!text && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json({ error: 'Text or media is required' }, { status: 400 });
    }

    const apiKey = getZernioKeyForUser(email || 'default@freire.com');
    const client = new Zernio({ apiKey, timeout: 120000 }); // 120s timeout for video processing

    // ── Build the correct CreatePostData body ──
    const body: any = {
      publishNow: true, // CRITICAL: without this, Zernio saves as draft and never publishes
    };

    // Content/caption
    if (text) {
      body.content = text;
    }

    // ── Build media items ──
    if (mediaUrls && mediaUrls.length > 0) {
      const mediaItems: { type: string; url: string }[] = [];

      for (const m of mediaUrls) {
        if (m.startsWith('data:')) {
          try {
            // Parse the data URI
            const mimeMatch = m.match(/^data:([\w/]+);base64,/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const base64Data = m.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');

            // Determine file type and extension
            const isVideo = mime.startsWith('video/');
            const ext = isVideo ? 'mp4' : 'jpg';
            const mediaType = isVideo ? 'video' : 'image';
            const contentType = isVideo ? 'video/mp4' : 'image/jpeg';

            // Get a presigned upload URL from Zernio
            const presignRes = await client.media.getMediaPresignedUrl({
              body: {
                filename: `freire-placa-${Date.now()}.${ext}`,
                contentType: contentType as any,
                size: buffer.length,
              },
            });

            const presignData = presignRes.data as any;

            if (presignData?.uploadUrl && presignData?.publicUrl) {
              const uploadResponse = await fetch(presignData.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: buffer,
              });

              if (uploadResponse.ok) {
                mediaItems.push({ type: mediaType, url: presignData.publicUrl });
                console.log(`✅ Uploaded media via Zernio presigned URL: ${presignData.publicUrl}`);
              } else {
                console.error('Failed to upload to presigned URL:', uploadResponse.status, await uploadResponse.text());
                mediaItems.push({ type: mediaType, url: m });
              }
            } else {
              console.error('Presign response missing uploadUrl/publicUrl:', presignData);
              mediaItems.push({ type: mediaType, url: m });
            }
          } catch (uploadErr) {
            console.error('Media upload error:', uploadErr);
            mediaItems.push({ type: 'image', url: m });
          }
        } else {
          // Already a public URL (video uploaded via presigned)
          const isVideo = m.includes('.mp4') || m.includes('.webm') || m.includes('.mov');
          mediaItems.push({
            type: isVideo ? 'video' : 'image',
            url: m,
          });
        }
      }

      if (mediaItems.length > 0) {
        body.mediaItems = mediaItems;
      }
    }

    // ── Build platforms array ──
    // NEW: Frontend sends accounts with platform already resolved → no listAccounts needed
    if (accounts && accounts.length > 0) {
      const platforms: any[] = [];
      for (const acc of accounts) {
        const platformEntry: any = {
          platform: acc.platform?.toLowerCase() || 'instagram',
          accountId: acc.id,
        };

        // For stories, set platformSpecificData
        if (['instagram', 'facebook'].includes(platformEntry.platform) && contentFormat === 'story') {
          platformEntry.platformSpecificData = { contentType: 'story' };
        }

        platforms.push(platformEntry);
      }
      body.platforms = platforms;
    } else if (socialAccountIds && socialAccountIds.length > 0) {
      // FALLBACK: Old format without platform info — must call listAccounts
      console.warn('⚠️ Using deprecated socialAccountIds format. Send accounts[] instead.');
      const pId = profileId ? { query: { profileId } } : undefined;
      const accountsRes = await client.accounts.listAccounts(pId);
      const accountsList = (accountsRes.data as any)?.accounts || [];

      const platforms: any[] = [];
      for (const id of socialAccountIds) {
        const found = accountsList.find((a: any) => a._id === id || a.id === id);
        const platformName = found?.platform || 'instagram';
        const platformEntry: any = { platform: platformName, accountId: id };

        if (['instagram', 'facebook'].includes(platformName) && contentFormat === 'story') {
          platformEntry.platformSpecificData = { contentType: 'story' };
        }

        platforms.push(platformEntry);
      }
      body.platforms = platforms;
    }

    if (profileId) {
      body.profileId = profileId;
    }

    console.log('📤 Zernio createPost payload:', JSON.stringify(body, null, 2));

    // Use the SDK to create the post
    const postRes = await client.posts.createPost({ body });
    const data = postRes.data || postRes;

    console.log('✅ Zernio createPost response:', JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Social Publish Error:', error);
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode || 500 }
    );
  }
}
