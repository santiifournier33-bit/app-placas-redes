import { NextResponse } from 'next/server';
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';

/**
 * Netlify reserva AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY.
 * Usamos estos nombres alternativos para evitar el error.
 */
const ACCESS_KEY = process.env.REMOTION_AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;

if (ACCESS_KEY && SECRET_KEY) {
  process.env.AWS_ACCESS_KEY_ID = ACCESS_KEY;
  process.env.AWS_SECRET_ACCESS_KEY = SECRET_KEY;
}


export async function POST(req: Request) {
  try {
    const { property, theme } = await req.json();

    const functionName = process.env.REMOTION_AWS_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_AWS_SERVE_URL;

    if (!functionName || !serveUrl) {
      return NextResponse.json({ 
        error: 'Las credenciales de AWS Remotion no están configuradas.',
        details: 'Faltan REMOTION_AWS_FUNCTION_NAME o REMOTION_AWS_SERVE_URL en el archivo .env.local' 
      }, { status: 500 });
    }

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: (process.env.REMOTION_AWS_REGION as any) || "us-east-1",
      functionName,
      serveUrl,
      composition: "PropertyReel",
      inputProps: {
        property,
        theme: theme || 'default',
      },
      codec: "h264",
      imageFormat: "jpeg",
      maxRetries: 1,
      privacy: "public",
    });

    return NextResponse.json({ renderId, bucketName });
  } catch (error: any) {
    console.error("Error iniciando Remotion Lambda:", error);
    return NextResponse.json({ error: error.message || 'Error iniciando render' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const renderId = searchParams.get('renderId');
    const bucketName = searchParams.get('bucketName');

    if (!renderId || !bucketName) {
      return NextResponse.json({ error: 'renderId y bucketName requeridos' }, { status: 400 });
    }

    const functionName = process.env.REMOTION_AWS_FUNCTION_NAME;

    if (!functionName) {
      return NextResponse.json({ error: 'Configuración de AWS incompleta.' }, { status: 500 });
    }

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region: (process.env.REMOTION_AWS_REGION as any) || "us-east-1",
    });

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error("Error obteniendo progreso:", error);
    return NextResponse.json({ error: error.message || 'Error en progreso' }, { status: 500 });
  }
}
