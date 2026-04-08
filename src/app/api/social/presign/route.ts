import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';
import Zernio from '@zernio/node';

export async function POST(req: Request) {
  try {
    const { email, filename, contentType, size } = await req.json();

    const apiKey = getZernioKeyForUser(email || 'default@freire.com');
    const client = new Zernio({ apiKey });

    // Step 1: Get a presigned upload URL from Zernio
    const presignRes = await client.media.getMediaPresignedUrl({
      body: {
        filename: filename || `freire-media-${Date.now()}`,
        contentType: contentType || 'video/mp4',
        size: size,
      },
    });

    const presignData = presignRes.data as any;

    if (!presignData?.uploadUrl || !presignData?.publicUrl) {
      console.error('Presign response missing uploadUrl/publicUrl:', presignData);
      return NextResponse.json(
        { error: 'Failed to get presigned upload URL from Zernio API' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadUrl: presignData.uploadUrl,
      publicUrl: presignData.publicUrl,
    });
  } catch (error: any) {
    console.error('❌ Presign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get presigned url' },
      { status: error.statusCode || 500 }
    );
  }
}
