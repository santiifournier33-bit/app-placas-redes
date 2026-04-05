import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { urlOrId } = await request.json();

    if (!urlOrId || !urlOrId.trim()) {
      return NextResponse.json({ error: "No se proporcionó URL o ID" }, { status: 400 });
    }

    const input = urlOrId.trim();
    let tokkoId: string | null = null;

    // Strategy 1: Pure numeric ID (e.g. "7909570")
    if (/^\d{5,10}$/.test(input)) {
      tokkoId = input;
    }
    // Strategy 2: Alphanumeric reference code like "FHO7909570" or "fho7909570"
    else if (/^[a-zA-Z]{2,5}\d{5,10}$/.test(input)) {
      const match = input.match(/(\d{5,10})$/);
      if (match) tokkoId = match[1];
    }
    // Strategy 3: URL from freirepropiedades.com/propiedades/ID
    else if (input.includes("freirepropiedades")) {
      const match = input.match(/\/propiedades\/(\d{5,10})/);
      if (match) {
        tokkoId = match[1];
      } else {
        // Try to extract any sequence of 5-10 digits from the URL
        const numMatch = input.match(/(\d{5,10})/);
        if (numMatch) tokkoId = numMatch[1];
      }
    }
    // Strategy 4: URL from ficha.info — extract Tokko ID from the page
    else if (input.includes("ficha.info")) {
      try {
        tokkoId = await extractIdFromFichaInfo(input);
      } catch (e) {
        console.error("Ficha.info extraction failed:", e);
      }
    }
    // Strategy 5: Any other text — try to find a 5-10 digit number
    else {
      const numMatch = input.match(/(\d{5,10})/);
      if (numMatch) tokkoId = numMatch[1];
    }

    if (!tokkoId) {
      return NextResponse.json(
        { error: "No se pudo extraer un ID válido. Ingresá un ID numérico de Tokko (ej: 7909570), un código como FHO7909570, o un link de freirepropiedades.com." },
        { status: 400 }
      );
    }

    // Fetch from Tokko Broker API
    const apiKey = process.env.TOKKO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta configuración de TOKKO_API_KEY" }, { status: 500 });
    }

    const tokkoUrl = `https://tokkobroker.com/api/v1/property/${tokkoId}/?key=${apiKey}&format=json&lang=es_ar`;
    const response = await fetch(tokkoUrl);

    if (!response.ok) {
      return NextResponse.json({ error: `Propiedad con ID ${tokkoId} no encontrada en Tokko Broker` }, { status: 404 });
    }

    const data = await response.json();
    const resolvedData = parseTokkoData(data);

    return NextResponse.json(resolvedData);

  } catch (error: any) {
    console.error("Error al obtener la propiedad:", error);
    return NextResponse.json({ error: "Error procesando la solicitud." }, { status: 500 });
  }
}

async function extractIdFromFichaInfo(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await response.text();

    // Method 1: Look for __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const id = findIdInObject(nextData);
        if (id) return id;
      } catch (e) { /* continue to other methods */ }
    }

    // Method 2: Look for tokkobroker API calls or property IDs in the HTML
    const tokkoMatch = html.match(/property\/(\d{5,10})/);
    if (tokkoMatch) return tokkoMatch[1];

    // Method 3: Look for common data patterns like "id":7909570
    const idMatch = html.match(/"id"\s*:\s*(\d{5,10})/);
    if (idMatch) return idMatch[1];

    // Method 4: Search for property_id or propertyId patterns
    const propIdMatch = html.match(/(?:property_id|propertyId|prop_id)[\s"':=]+(\d{5,10})/i);
    if (propIdMatch) return propIdMatch[1];

    return null;
  } catch (e) {
    return null;
  }
}

function findIdInObject(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // Look for typical Tokko property signatures
  if (obj.id && (obj.operations || obj.photos || obj.address || obj.fake_address || obj.reference_code)) {
    return String(obj.id);
  }

  for (const key of Object.keys(obj)) {
    const found = findIdInObject(obj[key]);
    if (found) return found;
  }

  return null;
}

function parseTokkoData(data: any) {
  // Extract richer data for all modules
  const operations = data.operations || [];
  const firstOp = operations[0] || {};
  const prices = firstOp.prices || [];
  const firstPrice = prices[0] || {};

  const typeNameMap: Record<string, string> = {
    'House': 'Casa', 'Apartment': 'Departamento', 'Land': 'Terreno', 'Office': 'Oficina',
    'Warehouse': 'Galpón', 'Commercial': 'Local', 'Garage': 'Cochera'
  };
  const opNameMap: Record<string, string> = {
    'Sale': 'Venta', 'Rent': 'Alquiler', 'Temporary rent': 'Alquiler Temporal'
  };

  const rawType = data.type?.name || "Propiedad";
  const rawOp = firstOp.operation_type || "Venta";

  return {
    id: data.id,
    reference_code: data.reference_code || "",
    type: typeNameMap[rawType] || rawType,
    operation_type: opNameMap[rawOp] || rawOp,
    price: firstPrice.price ? `${firstPrice.currency} ${Number(firstPrice.price).toLocaleString('es-AR')}` : "Consultar precio",
    price_raw: firstPrice.price || 0,
    currency: firstPrice.currency || "USD",
    address: data.fake_address || data.address || data.location?.name || "Dirección no disponible",
    location: data.location?.name || "",
    full_location: data.location?.full_location || "",
    description: (data.rich_description || data.description || "")
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/gi, ' ')
      .trim(),
    surface_total: data.surface || data.total_surface || 0,
    surface_covered: data.roofed_surface || 0,
    surface_uncovered: data.unroofed_surface || 0,
    surface_semicovered: data.semiroofed_surface || 0,
    surface_land: data.surface || data.land_surface || 0,
    rooms: data.room_amount || 0,
    bathrooms: data.bathroom_amount || 0,
    bedrooms: data.suite_amount || 0,
    parking: data.parking_lot_amount || 0,
    orientation: data.disposition || "",
    age: data.age || 0,
    expenses: data.expenses || 0,
    apt_credit: data.apt_professional_use ? "Sí" : "No",
    photos: data.photos?.map((p: any) => p.original) || [],
    thumbnail: data.photos?.[0]?.thumb || data.photos?.[0]?.original || "",
    videos: data.videos || [],
    tags: data.tags || [],
    custom_tags: data.custom_tags || [],
    geo_lat: data.geo_lat || null,
    geo_long: data.geo_long || null,
    agent: data.agent || null,
    producer: data.producer || null,
    broker: data.broker || null,
  };
}
