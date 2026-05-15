/**
 * Pure HTTP scraper for Tokko Broker — no browser, runs in background.
 * Login flow + file list + download via axios with cookie jar.
 */
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cheerio = require('cheerio');

const TOKKO_URL = 'https://www.tokkobroker.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let _client = null;
let _jar = null;
let _loggedIn = false;

function getClient() {
  if (_client) return _client;
  _jar = new CookieJar();
  _client = wrapper(axios.create({
    jar: _jar,
    withCredentials: true,
    timeout: 30000,
    maxRedirects: 10,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    },
  }));
  return _client;
}

/** Force a fresh login on next call (e.g., after session expiry) */
function resetLogin() {
  _client = null;
  _jar = null;
  _loggedIn = false;
}

/** Returns cookies currently stored in the jar (for debugging) */
async function inspectSession() {
  if (!_jar) return { hasCookies: false, cookies: [] };
  const cookies = await _jar.getCookies(TOKKO_URL);
  return {
    hasCookies: cookies.length > 0,
    hasSessionId: cookies.some(c => c.key === 'sessionid'),
    cookies: cookies.map(c => ({ key: c.key, domain: c.domain, path: c.path, expires: c.expires })),
  };
}

async function login(email, password) {
  if (_loggedIn) {
    // Verify the session is still valid — if the jar has no sessionid, force re-login
    const session = await inspectSession();
    if (!session.hasSessionId) {
      console.warn('[tokko-http] Session cookie missing, forcing re-login...');
      resetLogin();
    } else {
      return; // Session still valid
    }
  }

  const client = getClient();

  // Step 1: GET login page to obtain CSRF token
  const loginPageRes = await client.get(`${TOKKO_URL}/login/`);
  const $ = cheerio.load(loginPageRes.data);
  const csrfToken = $('input[name="csrfmiddlewaretoken"]').attr('value');

  if (!csrfToken) throw new Error('No se encontró csrfmiddlewaretoken en la página de login de Tokko.');

  console.log(`[tokko-http] CSRF token obtenido: ${csrfToken.slice(0, 10)}...`);

  // Step 2: POST credentials
  const formData = new URLSearchParams({
    csrfmiddlewaretoken: csrfToken,
    username: email,
    password: password,
  });

  const loginRes = await client.post(
    `${TOKKO_URL}/login/?next=/home`,
    formData.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${TOKKO_URL}/login/`,
      },
      maxRedirects: 10,
      validateStatus: s => s < 400,
    }
  );

  // Step 3: Verify login by checking session cookie (most reliable method)
  const session = await inspectSession();
  console.log(`[tokko-http] Post-login cookies: ${JSON.stringify(session.cookies.map(c => c.key))}`);

  if (!session.hasSessionId) {
    const finalUrl = loginRes.request?.res?.responseUrl || 'unknown';
    throw new Error(`Login fallido para ${email}. No se encontró cookie 'sessionid' tras el intento. URL final: ${finalUrl}. Verificá usuario y contraseña en tokko-drive-sync/.env`);
  }

  console.log(`[tokko-http] Login exitoso para ${email}. sessionid OK.`);
  _loggedIn = true;
}

async function getPropertyFiles(propertyId) {
  const client = getClient();

  const url = `${TOKKO_URL}/multiuploader/main/${propertyId}/?type=files&get_files=true`;
  let res;
  try {
    res = await client.get(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': `${TOKKO_URL}/property/${propertyId}/`,
      },
    });
  } catch (err) {
    console.error(`[tokko-http] getPropertyFiles HTTP error for ${propertyId}:`, err.message);
    throw err;
  }

  const data = res.data;
  const responseType = Array.isArray(data) ? 'array' : typeof data;
  console.log(`[tokko-http] getPropertyFiles(${propertyId}): status=${res.status}, type=${responseType}, raw=`, JSON.stringify(data).slice(0, 300));

  // Tokko may return the array directly OR wrapped in { files: [...] } or { objects: [...] }
  let filesArr = [];
  if (Array.isArray(data)) {
    filesArr = data;
  } else if (data && Array.isArray(data.files)) {
    filesArr = data.files;
  } else if (data && Array.isArray(data.objects)) {
    filesArr = data.objects;
  } else {
    console.warn(`[tokko-http] getPropertyFiles(${propertyId}): unexpected response format, cannot extract files.`);
    return [];
  }

  const mapped = filesArr
    .filter(f => f.id && (f.name || f.filename) && (f.url || f.file_url || f.download_url))
    .map(f => ({
      id: String(f.id),
      name: f.name || f.filename,
      url: (() => {
        const raw = f.url || f.file_url || f.download_url || '';
        return raw.startsWith('http') ? raw : `${TOKKO_URL}${raw}`;
      })(),
    }));

  console.log(`[tokko-http] getPropertyFiles(${propertyId}): ${mapped.length} file(s) found after filter.`);
  return mapped;
}

async function downloadFile(fileUrl) {
  const client = getClient();
  const res = await client.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxRedirects: 5,
  });
  return Buffer.from(res.data);
}

async function _debugGetHtml(path) {
  const res = await getClient().get(`${TOKKO_URL}${path}`);
  return res.data;
}

module.exports = { login, resetLogin, inspectSession, getPropertyFiles, downloadFile, _debugGetHtml };

