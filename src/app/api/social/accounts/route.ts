import { NextResponse } from 'next/server';

/**
 * FETCH /api/social/accounts
 * Obtiene los "Social Sets" o "Accounts".
 * IMPLEMENTACIÓN CUSTOM: Como no hay DB, generamos credenciales simuladas y permanentes
 * basadas en el correo del usuario (agente) para que siempre estén "logueados".
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'asesor@freire.com';
    
    // Generar un nombre de usuario basado en el email para que sea personalizado
    const usernameBase = email.split('@')[0];
    const instagramHandle = `@${usernameBase}_freire`;
    const facebookHandle = `Freire Propiedades - ${usernameBase.charAt(0).toUpperCase() + usernameBase.slice(1)}`;
    
    // Devolvemos el mock permanente de cuentas
    // Simulando exitosamente que el asesor YA TIENE las cuentas de esa sucursal conectadas.
    const mockAccounts = [
      {
        id: `ig_${usernameBase}`,
        platform: 'Instagram',
        name: instagramHandle,
        profilePic: 'https://ui-avatars.com/api/?name=IG&background=E1306C&color=fff',
      },
      {
        id: `fb_${usernameBase}`,
        platform: 'Facebook',
        name: facebookHandle,
        profilePic: 'https://ui-avatars.com/api/?name=FB&background=1877F2&color=fff',
      }
    ];

    return NextResponse.json({ data: mockAccounts });
  } catch (error: any) {
    console.error('Social Accounts Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

