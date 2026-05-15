const { GoogleGenerativeAI } = require('@google/generative-ai');

let client = null;
function getClient() {
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

const cache = new Map();

async function extractLocation(property) {
  const id = property.id;
  if (cache.has(id)) return cache.get(id);

  const officialLocation = property.location?.name || '';
  const shortLocation = property.location?.short_location || '';
  const fullLocation = property.location?.full_location || '';
  const title = property.publication_title || '';
  const description = (property.description || property.description_only || '').slice(0, 1000);
  const street = property.address_street || '';
  const streetNumber = property.address_number || '';
  const complement = property.address_complement || '';
  const realAddress = property.real_address || '';
  const building = property.building || '';

  const prompt = `Sos un experto en inmuebles de Argentina, zona Pilar/GBA Norte.

Datos completos de la propiedad:
- Ubicación oficial: "${officialLocation}"
- Ubicación corta: "${shortLocation}"
- Ubicación completa: "${fullLocation}"
- Calle: "${street}" ${streetNumber}
- Complemento dirección: "${complement}"
- Dirección real: "${realAddress}"
- Edificio/Complejo: "${building}"
- Título publicación: "${title}"
- Descripción: "${description}"

Tu tarea: armar el nombre de ubicación MÁS ESPECÍFICO posible para usar como nombre de carpeta en Google Drive.

Jerarquía de especificidad (de mejor a peor):
1. Nombre del country/barrio/edificio/condominio + calle si suma info (ej: "Santa Maria Calle Los Robles")
2. Nombre del country/barrio/edificio/condominio solo (ej: "Country El Canton", "Edificio El Reparo")
3. Localidad + calle (ej: "Pilar Av Derqui 450", "Manzanares Ruta 25 Km 52")
4. Localidad + zona/referencia (ej: "Pilar Ruta 25", "Escobar Zona Industrial")
5. Solo localidad — EVITAR si hay algo más específico disponible

PROHIBIDO usar solo: "Pilar", "Escobar", "La Lonja", "Belén de Escobar", "Buenos Aires", "GBA" como respuesta final si hay datos más específicos disponibles.

Formato:
- Máximo 5 palabras
- Sin caracteres especiales (no: / \\ : * ? " < > |)
- Sin comillas
- Solo el nombre, sin explicación`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/[<>:"/\\|?*\n"]/g, '').trim();
      cache.set(id, text);
      return text;
    } catch (err) {
      const is429 = err.message?.includes('429') || err.status === 429;
      if (is429 && attempt < 5) {
        // Extract retry delay from error message if present
        const match = err.message?.match(/retryDelay":"(\d+)s/);
        const waitSec = match ? parseInt(match[1]) + 2 : 15 * attempt;
        console.log(`  Rate limit hit — waiting ${waitSec}s before retry (attempt ${attempt}/5)...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }
      console.error(`  Location extraction failed for ${id}: ${err.message?.slice(0, 80)}`);
      const fallback = building || street || officialLocation || 'Sin ubicacion';
      cache.set(id, fallback);
      return fallback;
    }
  }
}

module.exports = { extractLocation };
