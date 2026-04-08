import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

/**
 * POST /api/upload-video
 *
 * Uploads a rendered video blob to Zernio's presigned storage.
 * This is more reliable than external services like catbox.moe.
 *
 * Request body:
 *   - email: advisor email for Zernio key lookup
 *   - videoBlob: Blob object converted to base64 or sent as multipart form-data
 *
 * Returns:
 *   - publicUrl: the URL to pass to /api/social/publish as mediaUrls
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const email = formData.get('email') as string || 'default@freire.com';
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const apiKey = getZernioKeyForUser(email);
    const client = new Zernio({ apiKey });

    console.log(`📹 Uploading video: ${file.name} (${buffer.length} bytes, ${file.type})`);

    // Step 1: Get a presigned upload URL from Zernio
    const presignRes = await client.media.getMediaPresignedUrl({
      body: {
        filename: `freire-video-${Date.now()}.mp4`,
        contentType: 'video/mp4',
        size: buffer.length,
      },
    });

    const presignData = presignRes.data as any;

    if (!presignData?.uploadUrl || !presignData?.publicUrl) {
      console.error('Presign response missing uploadUrl/publicUrl:', presignData);
      return NextResponse.json(
        { error: 'Failed to get presigned upload URL from Zernio' },
        { status: 500 }
      );
    }

    // Step 2: Upload the file to Zernio's presigned URL
    const uploadResponse = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Failed to upload to presigned URL:', uploadResponse.status, errorText);
      return NextResponse.json(
        { error: `Upload to Zernio storage failed: ${uploadResponse.status}` },
        { status: 500 }
      );
    }

    console.log(`✅ Video uploaded successfully: ${presignData.publicUrl}`);

    return NextResponse.json({
      success: true,
      publicUrl: presignData.publicUrl,
    });
  } catch (error: any) {
    console.error('❌ Video upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload video' },
      { status: error.statusCode || 500 }
    );
  }
}
