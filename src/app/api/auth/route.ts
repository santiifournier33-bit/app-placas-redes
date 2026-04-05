import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    // 1. Get the CSRF token from Tokko
    const initialRes = await fetch('https://www.tokkobroker.com/go/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });

    const setCookieHeader = initialRes.headers.get('set-cookie');
    if (!setCookieHeader) {
      return NextResponse.json({ error: 'No se pudo inicializar la sesión con Tokko' }, { status: 502 });
    }

    // Extract csrftoken
    let csrftoken = '';
    const match = setCookieHeader.match(/csrftoken=([^;]+)/);
    if (match && match[1]) {
      csrftoken = match[1];
    }

    if (!csrftoken) {
      return NextResponse.json({ error: 'No se obtuvo token de seguridad de Tokko' }, { status: 502 });
    }

    // 2. Perform the actual POST login
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    formData.append('csrfmiddlewaretoken', csrftoken);
    formData.append('next', '/home');

    const loginRes = await fetch('https://www.tokkobroker.com/login/?next=/home', {
      method: 'POST',
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Referer': 'https://www.tokkobroker.com/go/',
        'Origin': 'https://www.tokkobroker.com',
        'Cookie': `csrftoken=${csrftoken}`
      },
      redirect: 'manual' // We need to detect the 302 redirect manually
    });

    // 3. Analyze the result
    // Tokko redirects to /home on success, or /invalid_login/ on failure
    const location = loginRes.headers.get('location');

    if (loginRes.status === 302 && location?.includes('/home') && !location.includes('/invalid_login/')) {
      // Success!
      return NextResponse.json({
        success: true,
        user: { email }
      });
    } else {
      // Failure
      return NextResponse.json({
        success: false,
        error: 'Las credenciales ingresadas son incorrectas.'
      }, { status: 401 });
    }

  } catch (error: any) {
    console.error('Error during login proxy:', error);
    return NextResponse.json({ error: 'Error del servidor al intentar conectar con Tokko' }, { status: 500 });
  }
}
