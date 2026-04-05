import { NextResponse } from 'next/server';
import { getZernioKeyForUser } from '@/lib/zernio';

/**
 * FETCH /api/social/accounts
 * Obtiene los "Social Sets" o "Accounts" conectados en la cuenta Zernio correspondiente al usuario.
 */
export async function GET(req: Request) {
  try {
    // In a real app, retrieve the user email from the session. 
    // Here we'll take it from the URL parameter for the demo or assume a default.
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'default@freire.com';
    
    // Obtenemos qué KEY maestra le toca a este asesor
    const apiKey = getZernioKeyForUser(email);
    
    // Simulamos la llamada a Zernio para obtener las cuentas de redes vinculadas.
    // Documentation: GET https://zernio.com/api/v1/accounts
    const response = await fetch('https://zernio.com/api/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // Mock fallback if endpoint differs, allowing front-end to render without crash
        return NextResponse.json({ accounts: [] });
      }
      return NextResponse.json({ error: 'Failed to fetch accounts from Zernio' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Social Accounts Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
