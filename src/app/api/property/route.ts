import { NextResponse } from 'next/server';
import { fetchAndParseTokkoProperty, TokkoConfigError, TokkoNotFoundError } from '@/lib/tokko/property';

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
    const resolvedData = await fetchAndParseTokkoProperty(tokkoId);

    return NextResponse.json(resolvedData);

  } catch (error: any) {
    if (error instanceof TokkoConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof TokkoNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
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

