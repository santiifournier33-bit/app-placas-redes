import { NextResponse } from "next/server";

async function callGeminiNative(systemPrompt: string, userText: string, apiKey: string) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\n" + userText }]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }

  return data.candidates[0].content.parts[0].text;
}

export async function POST(request: Request) {
  try {
    const { property, type } = await request.json();

    if (!property) {
      return NextResponse.json({ error: "Faltan datos de la propiedad" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta configurar GEMINI_API_KEY" }, { status: 500 });
    }

    // Build rich property context
    const propertyContext = [
      property.address && `Dirección: ${property.address}`,
      `Ubicación: ${property.location || "N/A"}`,
      `Tipo: ${property.type || "Propiedad"}`,
      `Operación: ${property.operation_type || "Venta"}`,
      property.price && `Precio: ${property.price}`,
      `Ambientes: ${property.rooms || "N/A"}`,
      `Dormitorios: ${property.bedrooms || "N/A"}`,
      `Baños: ${property.bathrooms || "N/A"}`,
      `Superficie Total: ${property.surface_total || "N/A"}m²`,
      `Superficie Cubierta: ${property.surface_covered || "N/A"}m²`,
      property.surface_semicovered && `Superficie Semicubierta: ${property.surface_semicovered}m²`,
      `Cochera: ${property.parking || 0}`,
      `Descripción original: ${property.description || "Sin descripción"}`,
    ].filter(Boolean).join("\n");

    if (type === "redes_sociales") {
      // ── TONO 1: CATÁLOGO PREMIUM ──
      const promptCatalogo = `Actuá como un copywriter inmobiliario profesional especializado en propiedades en Argentina.

Tu objetivo es redactar un copy para redes sociales (Instagram/Facebook) con un estilo claro, ordenado y profesional, tipo "catálogo premium", optimizado para generar consultas.

Vas a recibir información estructurada de una propiedad (proveniente de un CRM inmobiliario como Tokko Broker), que puede incluir:
- Tipo de propiedad
- Operación (venta/alquiler)
- Ubicación
- Superficie
- Ambientes
- Características
- Descripción
- Amenities
- Precio (opcional)

INSTRUCCIONES:

1. Comenzá con un título claro y directo (ej: "Casa en venta | 4 ambientes con parque y pileta").
2. Agregá la ubicación con emoji 📍.
3. Escribí una breve bajada descriptiva (1–2 líneas).
4. Listá las características principales en formato escaneable (líneas cortas con separadores tipo "|").
5. Destacá amenities o diferenciales con emojis (🌿🔥🏊‍♂️ etc.).
6. Podés incluir superficie si está disponible.
7. Terminá con un llamado a la acción claro (ej: "Escribinos para más info").
8. Cerrá con 3 a 6 hashtags relevantes.

ESTILO:
- Profesional, claro, prolijo
- Frases cortas
- No exagerar
- Fácil de leer desde celular

IMPORTANTE:
- No inventes información
- Priorizá lo más atractivo de la propiedad
- Adaptá el texto según los datos disponibles

Generá un único copy final listo para publicar. Respondé SOLO con el texto del copy, sin explicaciones ni formato JSON.`;

      // ── TONO 2: LIFESTYLE / EMOCIONAL ──
      const promptLifestyle = `Actuá como un copywriter inmobiliario especializado en marketing emocional para propiedades en Argentina.

Tu objetivo es redactar un copy para redes sociales que transmita estilo de vida, pero de forma concisa, clara y directa (evitar textos largos o narrativos tipo "cuento").

Vas a recibir datos de una propiedad desde un CRM (Tokko Broker), incluyendo características, ambientes, ubicación y descripción.

INSTRUCCIONES:

1. Comenzá con una frase gancho emocional breve (máximo 1 línea).
   (Ej: "Un lugar para bajar un cambio y disfrutar del verde 🌿")

2. Escribí una descripción corta (2–3 líneas máximo) enfocada en:
   - cómo se vive la propiedad
   - sensaciones reales (sin exagerar)

3. Integrá algunas características de forma natural dentro del texto (sin listar todo).

4. Luego agregá un bloque breve y escaneable con info clave:
   (ej: "2 ambientes | 1 dormitorio | 1000 m² lote | pileta")

5. Destacá 2–3 diferenciales importantes (no más):
   (ej: sin expensas, apto crédito, ubicación, pileta, potencial)

6. Terminá con un llamado a la acción corto y natural:
   (ej: "Escribinos y coordinamos una visita")

7. Agregá 3 a 5 hashtags relevantes.

ESTILO:
- Cercano, humano y argentino
- Inspirador pero realista
- Directo (evitar relleno)
- Evitar frases largas o redundantes

REGLAS CLAVE:
- Máximo total: 150 - 170 palabras
- No escribir párrafos largos (máx. 3 líneas cada uno)
- No hacer storytelling extenso
- No repetir ideas
- No usar frases genéricas tipo "este es el hogar de tus sueños"

IMPORTANTE:
- No inventar información
- Priorizar lo más atractivo de la propiedad
- Convertir datos técnicos en beneficios concretos

Generá un único copy final listo para publicar. Respondé SOLO con el texto del copy, sin explicaciones ni formato JSON.`;

      // ── TONO 3: COMERCIAL / OPORTUNIDAD ──
      const promptComercial = `Actuá como un copywriter inmobiliario orientado a conversión directa.

Tu objetivo es redactar un copy para redes sociales que genere urgencia, destaque oportunidad y motive a consultar rápidamente.

Vas a recibir datos de una propiedad desde un CRM inmobiliario (Tokko Broker).

INSTRUCCIONES:

1. Comenzá con un gancho fuerte:
   - oportunidad
   - precio
   - ubicación
   - financiación
   (ej: "⚠️ Oportunidad en zona clave" o "💸 Ideal inversión")

2. Indicá tipo de propiedad + operación.

3. Mostrá ubicación.

4. Listá características principales de forma rápida y clara.

5. Si hay precio, incluirlo de forma visible.

6. Agregá una frase de urgencia:
   (ej: "Alta demanda en la zona", "No dura mucho en el mercado")

7. Cerrá con CTA directo:
   (ej: "Escribinos ahora y coordinamos visita")

8. Sumá hashtags.

ESTILO:
- Directo
- Comercial
- Claro
- Sin relleno

IMPORTANTE:
- No inventar datos
- Priorizar lo más vendible
- Optimizado para generar leads

Generá un único copy final listo para publicar. Respondé SOLO con el texto del copy, sin explicaciones ni formato JSON.`;

      const propertyData = "DATOS DE LA PROPIEDAD:\n" + propertyContext;

      // Ejecutar las 3 llamadas en paralelo para mayor velocidad
      const [rawCatalogo, rawLifestyle, rawComercial] = await Promise.all([
        callGeminiNative(promptCatalogo, propertyData, apiKey),
        callGeminiNative(promptLifestyle, propertyData, apiKey),
        callGeminiNative(promptComercial, propertyData, apiKey),
      ]);

      return NextResponse.json({
        type: "variants",
        variants: {
          descriptivo: { title: "Catálogo Premium", subtitle: "Claro, ordenado y escaneable", content: rawCatalogo.trim() },
          emocional: { title: "Lifestyle / Emocional", subtitle: "Vende sensación y estilo de vida", content: rawLifestyle.trim() },
          urgencia: { title: "Comercial / Oportunidad", subtitle: "Directo a convertir con urgencia", content: rawComercial.trim() },
        }
      });
    } 
    else if (type === "tokko_description") {
      const systemPrompt = `Tu objetivo es generar una "Descripción para Tokko Broker" profesional, enfocada en ventas y 100% optimizada para conversión.
Actuarás como un experto tasador y asesor inmobiliario de alta gama en Argentina.

Vas a recibir datos sueltos de una propiedad. Tu trabajo es redactar la descripción FINAL que se publicará en el portal.

### REGLAS ESTRICTAS DE REDACCIÓN:
1. TONO: Comercial, serio, preciso y orientado a destacar el ALTO VALOR de la propiedad.
2. ESTRUCTURA OBLIGATORIA:
   - TÍTULO EN MAYÚSCULAS: Fuerte y descriptivo (Ej: "EXCLUSIVA CASA DE 5 AMBIENTES EN BARRIO PRIVADO PILAR").
   - PÁRRAFO DE INTRODUCCIÓN: Corto, destacando la ubicación, el tipo de propiedad y su mayor atractivo (luminosidad, estado impecable, amenities, ubicación estratégica).
   - DISTRIBUCIÓN Y AMBIENTES (La parte principal): Usar viñetas (guiones) de forma muy prolija para listar los ambientes, qué hay en cada uno y sus características principales. Detallar medidas si se dan.
   - EXTERIORES/AMENITIES: (Opcional, si hay) Lote, jardín, pileta, seguridad, amenities del edificio.
   - DETALLES TÉCNICOS/TERMINACIONES: (Opcional, si hay) Tipo de pisos, calefacción, aberturas, antigüedad, expensas.
   - CIERRE: "Consultanos para coordinar una visita." (Fijar esta frase textualmente o similar, simple).
3. PROHIBICIONES (ANTI-RELLENO):
   - PROHIBIDO usar palabras como "¡Bienvenidos a tu nuevo hogar!", "La casa de tus sueños", "Imaginate viviendo acá". (Cero romanticismo barato).
   - PROHIBIDO usar emojis.
   - PROHIBIDO dejar campos como [Insertar aquí] o frases incompletas. Lo que no está, no se menciona.
   - PROHIBIDO inventar amenities o características que no estén en los datos.

INSTRUCCIÓN FINAL: Entregá ÚNICAMENTE el texto final formateado, sin comentarios extras tuyos.`;

      const rawText = await callGeminiNative(systemPrompt, propertyContext, apiKey);
      return NextResponse.json({ type: "single", content: rawText });
    }
    else if (type === "location_parse") {
      const systemPrompt = `Sos un experto en extracción y jerarquización de datos inmobiliarios. Tu objetivo es extraer la ubicación de la propiedad y estructurarla en dos partes exactas:

1) "title": El nombre exacto del barrio, condominio, barrio privado o edificio donde está la propiedad (Ej: "Barrio Las Bermudas", "Condominio Las Cañitas"). LEÉ ATENTAMENTE LA DESCRIPCIÓN ORIGINAL para encontrar el nombre real del barrio o complejo si no está claro en la ubicación/dirección.
2) "subtitle": La localidad, ciudad o región general, preservando divisiones con separadores como | si aplica (Ej: "Countries/B.Cerrado (Pilar) | Pilar", "Argentina | G.B.A. Zona Norte").

REGLA ESTRICTA: Respondé EXCLUSIVAMENTE con un JSON válido respetando las claves "title" y "subtitle". Sin texto adicional ni formato markdown. Ejemplo de respuesta:
{"title": "Barrio Las Bermudas", "subtitle": "Countries/B.Cerrado (Pilar) | Pilar"}`;

      const rawText = await callGeminiNative(systemPrompt, propertyContext, apiKey);
      try {
        const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({ type: "location", title: parsed.title, subtitle: parsed.subtitle });
      } catch (parseError) {
        return NextResponse.json({ type: "location", title: property.address, subtitle: property.location });
      }
    }
    else if (type === "video") {
      const systemPrompt = `Sos un guionista para videos cortos de Real Estate (Reels / YouTube Shorts) que trabaja para Freire Propiedades.
Escribí el guión de locución (Voice Over) para promocionar esta propiedad.
Reglas:
1. Menos de 40 segundos de lectura (120-150 palabras máximo).
2. Un gancho visual y auditivo en los primeros 3 segundos.
3. Ritmo dinámico. Señalar qué mostrar en pantalla entre corchetes, ej: [Mostrar cocina].
4. Tono premium y seductor.`;

      const rawText = await callGeminiNative(systemPrompt, propertyContext, apiKey);
      return NextResponse.json({ type: "single", content: rawText });
    }
    else {
      const systemPrompt = "Sos un redactor inmobiliario. Reescribí los datos provistos de forma clara y atractiva para uso profesional.";
      const rawText = await callGeminiNative(systemPrompt, propertyContext, apiKey);
      return NextResponse.json({ type: "single", content: rawText });
    }

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    const isRateLimit = error?.message?.includes("429");
    if (isRateLimit) {
      return NextResponse.json({ error: "La API de Gemini está temporalmente limitada. Esperá unos segundos e intentá de nuevo." }, { status: 429 });
    }
    return NextResponse.json({ error: `Error de API: ${error?.message || error}` }, { status: 500 });
  }
}
