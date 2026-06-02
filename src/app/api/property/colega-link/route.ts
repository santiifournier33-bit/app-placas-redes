import { NextResponse } from 'next/server';
import { signColegaToken } from '@/lib/colega/token';

// Mintea el "Link para colegas": cifra el id Tokko en un token opaco y devuelve
// la URL pública /ficha/[token] (ficha sin datos del asesor/inmobiliaria).
export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    const tokkoId = Number(id);
    if (!Number.isInteger(tokkoId) || tokkoId <= 0) {
      return NextResponse.json(
        { error: 'ID de propiedad inválido', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    let token: string;
    try {
      token = signColegaToken(tokkoId);
    } catch {
      return NextResponse.json(
        { error: 'Link para colegas no configurado en el servidor', code: 'COLEGA_SECRET_MISSING' },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;
    return NextResponse.json({ url: `${origin}/ficha/${token}` });
  } catch (error) {
    console.error('Error generando link para colegas:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
