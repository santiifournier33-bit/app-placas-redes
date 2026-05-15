import { NextResponse } from 'next/server';

let cachedAgents: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET() {
  try {
    const apiKey = process.env.TOKKO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta configuración de TOKKO_API_KEY' }, { status: 500 });
    }

    if (cachedAgents && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ agents: cachedAgents, cached: true });
    }

    // Fetch users (agents) directly from Tokko
    const baseUrl = `https://tokkobroker.com/api/v1/user/?key=${apiKey}&format=json&limit=100`;
    const res = await fetch(baseUrl);
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Error al conectar con Tokko Broker' }, { status: 502 });
    }
    
    const data = await res.json();
    const agents: Record<string, string> = {};

    (data.objects || []).forEach((u: any) => {
      if (u.email && u.name) {
        agents[u.email.toLowerCase()] = u.name;
      }
    });

    // Hardcode fallback just in case some agent doesn't have an active property but tries to log in
    if (!agents['contacto@freirepropiedades.com']) agents['contacto@freirepropiedades.com'] = 'Freire Propiedades';

    cachedAgents = agents;
    cacheTimestamp = Date.now();

    return NextResponse.json({ agents, cached: false });

  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Error al obtener agentes' }, { status: 500 });
  }
}
