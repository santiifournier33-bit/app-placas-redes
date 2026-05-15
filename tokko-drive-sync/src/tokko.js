const axios = require('axios');

const BASE_URL = 'https://www.tokkobroker.com/api/v1';
const PAGE_SIZE = 100;
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;

const OPERATION_MAP = {
  1: 'Venta',
  2: 'Alquiler',
  3: 'Alquiler temporario',
};

const OPERATION_NAME_MAP = {
  'sale': 'Venta',
  'rent': 'Alquiler',
  'temporary rent': 'Alquiler temporario',
};

const TYPE_NAME_MAP = {
  'house': 'Casa',
  'apartment': 'Departamento',
  'ph': 'PH',
  'office': 'Oficina',
  'local': 'Local',
  'store': 'Local',
  'warehouse': 'Galpon',
  'land': 'Terreno',
  'lot': 'Lote',
  'country': 'Country',
  'garage': 'Cochera',
  'field': 'Campo',
  'building': 'Edificio',
};

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
});

async function fetchWithRetry(url, params, attempt = 1) {
  try {
    const res = await client.get(url, { params });
    return res.data;
  } catch (err) {
    if (err.response) {
      console.error(`API error ${err.response.status}:`, JSON.stringify(err.response.data));
    }
    if (attempt >= MAX_RETRIES) throw err;
    const wait = attempt * 1000;
    await new Promise(r => setTimeout(r, wait));
    return fetchWithRetry(url, params, attempt + 1);
  }
}

async function getAllProperties(apiKey) {
  const properties = [];
  let offset = 0;
  let total = null;

  console.log('Fetching properties from Tokko Broker...');

  while (total === null || offset < total) {
    const data = await fetchWithRetry('/property/', {
      key: apiKey,
      format: 'json',
      lang: 'es_ar',
      limit: PAGE_SIZE,
      offset,
    });

    if (total === null) {
      total = data.meta?.total_count || data.count || data.objects?.length || 0;
      console.log(`Total properties: ${total}`);
    }

    const page = data.objects || data.results || [];
    if (page.length === 0) break;

    properties.push(...page);
    offset += page.length;
    console.log(`Fetched ${properties.length}/${total}`);

    if (page.length < PAGE_SIZE) break;
  }

  return properties;
}

function buildFolderName(property, resolvedLocation) {
  const id = property.id;

  const rawOperation = property.operations?.[0]?.operation_type || '';
  const operation = OPERATION_NAME_MAP[rawOperation.toLowerCase()]
    || OPERATION_MAP[property.operations?.[0]?.operation_id]
    || rawOperation
    || 'Operacion';

  const rawType = property.type?.name || '';
  const type = TYPE_NAME_MAP[rawType.toLowerCase()] || rawType || 'Propiedad';

  const location = resolvedLocation
    || property.location?.name
    || property.address_street
    || 'Sin ubicacion';

  const cleanName = (str) =>
    str.replace(/[<>:"/\\|?*]/g, '').trim();

  return `${id} - ${cleanName(operation)} ${cleanName(type)} ${cleanName(location)}`;
}

function getAgentName(property) {
  const producer = property.producer;
  if (!producer) return 'Sin Asesor';
  const name = `${producer.name || ''} ${producer.last_name || ''}`.trim();
  return name || producer.email || 'Sin Asesor';
}

function getPropertyFiles(property) {
  return property.files || property.documents || property.attachments || [];
}

module.exports = { getAllProperties, buildFolderName, getAgentName, getPropertyFiles };
