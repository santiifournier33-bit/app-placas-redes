import { NextResponse } from 'next/server';

// In-memory cache (survives across requests while server is running)
let cachedProperties: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const apiKey = process.env.TOKKO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta configuración de TOKKO_API_KEY' }, { status: 500 });
    }

    // Return cached data if fresh
    if (cachedProperties && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ properties: cachedProperties, total: cachedProperties.length, cached: true });
    }

    // Fetch all properties in parallel batches of 20
    const baseUrl = `https://tokkobroker.com/api/v1/property/?key=${apiKey}&format=json&lang=es_ar&limit=20`;

    // First, get the total count
    const firstRes = await fetch(`${baseUrl}&offset=0`);
    if (!firstRes.ok) {
      return NextResponse.json({ error: 'Error al conectar con Tokko Broker' }, { status: 502 });
    }
    const firstData = await firstRes.json();
    const totalCount = firstData.meta?.total_count || 0;
    const firstBatch = (firstData.objects || []).map(parseListing);

    if (totalCount <= 20) {
      cachedProperties = firstBatch;
      cacheTimestamp = Date.now();
      return NextResponse.json({ properties: firstBatch, total: firstBatch.length, cached: false });
    }

    // Fetch remaining batches in parallel
    const offsets: number[] = [];
    for (let i = 20; i < totalCount; i += 20) {
      offsets.push(i);
    }

    const batchPromises = offsets.map(offset =>
      fetch(`${baseUrl}&offset=${offset}`)
        .then(r => r.json())
        .then(d => (d.objects || []).map(parseListing))
        .catch(() => [])
    );

    const batches = await Promise.all(batchPromises);
    const allProperties = [...firstBatch, ...batches.flat()];

    cachedProperties = allProperties;
    cacheTimestamp = Date.now();

    return NextResponse.json({ properties: allProperties, total: allProperties.length, cached: false });

  } catch (error: any) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ error: 'Error al obtener propiedades' }, { status: 500 });
  }
}

function parseListing(data: any) {
  const operations = data.operations || [];
  const firstOp = operations[0] || {};
  const prices = firstOp.prices || [];
  const firstPrice = prices[0] || {};

  const typeMap: Record<string, string> = {
    'House': 'Casa', 'Apartment': 'Departamento', 'Land': 'Terreno', 'Office': 'Oficina',
    'Warehouse': 'Galpón', 'Commercial': 'Local', 'Garage': 'Cochera', 'PH': 'PH',
  };
  const opMap: Record<string, string> = {
    'Sale': 'Venta', 'Rent': 'Alquiler', 'Temporary rent': 'Alquiler Temporal',
  };

  const rawType = data.type?.name || 'Propiedad';
  const rawOp = firstOp.operation_type || 'Venta';

  return {
    id: data.id,
    reference_code: data.reference_code || '',
    type: typeMap[rawType] || rawType,
    operation_type: opMap[rawOp] || rawOp,
    title: `${typeMap[rawType] || rawType} en ${data.location?.name || data.fake_address || ''}`.trim(),
    address: data.fake_address || data.address || data.location?.name || '',
    location: data.location?.name || '',
    price: firstPrice.price ? `${firstPrice.currency} ${Number(firstPrice.price).toLocaleString('es-AR')}` : 'Consultar',
    price_raw: firstPrice.price || 0,
    currency: firstPrice.currency || 'USD',
    description: (data.description || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
      .substring(0, 200),
    rooms: data.room_amount || 0,
    bathrooms: data.bathroom_amount || 0,
    bedrooms: data.suite_amount || 0,
    surface_total: data.surface || data.total_surface || 0,
    surface_covered: data.roofed_surface || 0,
    thumbnail: data.photos?.[0]?.thumb || data.photos?.[0]?.original || '',
    photo: data.photos?.[0]?.original || '',
    tags: (data.tags || []).map((t: any) => t.name || t).filter(Boolean),
  };
}
