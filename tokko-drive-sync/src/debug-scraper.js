/**
 * DEBUG SCRIPT — descubre cómo funciona Tokko internamente
 * 1. Login interactivo (visible)
 * 2. Navega a propiedad 8002445
 * 3. Captura TODAS las requests de red
 * 4. Imprime URLs de descarga reales
 */
require('dotenv').config();
const { chromium } = require('playwright');

const EMAIL = process.env.TOKKO_EMAIL;
const PASSWORD = process.env.TOKKO_PASSWORD;
const PROPERTY_ID = '8002445';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // Capture ALL network requests
  const requests = [];
  page.on('request', req => {
    requests.push({ method: req.method(), url: req.url(), type: req.resourceType() });
  });

  page.on('response', async resp => {
    const ct = resp.headers()['content-type'] || '';
    if (ct.includes('pdf') || ct.includes('image') || ct.includes('octet-stream') || ct.includes('attachment')) {
      console.log(`[FILE RESPONSE] ${resp.status()} ${ct} → ${resp.url()}`);
    }
  });

  console.log('\n=== STEP 1: LOGIN ===');
  await page.goto('https://www.tokkobroker.com/login/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.getByPlaceholder('Usuario').fill(EMAIL);
  await page.getByPlaceholder('Contraseña').fill(PASSWORD);

  // Make sure checkboxes are checked
  const cbs = await page.locator('input[type="checkbox"]').all();
  for (const cb of cbs) {
    if (!(await cb.isChecked())) await cb.check();
  }

  console.log('Clicking Acceder...');
  await page.getByRole('button', { name: /acceder/i }).click();

  // Wait for navigation away from login
  try {
    await page.waitForURL(url => !url.toString().includes('not_connected') && !url.toString().includes('login'), { timeout: 20000 });
    console.log(`✓ Logged in. URL: ${page.url()}`);
  } catch (err) {
    console.log(`✗ Login may have failed. Current URL: ${page.url()}`);
    await page.screenshot({ path: 'debug-login-failed.png' });
    console.log('Screenshot saved: debug-login-failed.png');
  }

  console.log('\n=== STEP 2: NAVIGATE TO PROPERTY ===');
  await page.goto(`https://www.tokkobroker.com/property/${PROPERTY_ID}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log(`URL: ${page.url()}`);
  await page.screenshot({ path: 'debug-property-page.png', fullPage: true });

  console.log('\n=== STEP 3: FIND ARCHIVOS TAB ===');
  // Try multiple ways to find Archivos tab
  const archivosCandidates = [
    page.getByRole('tab', { name: /archivos/i }),
    page.getByRole('link', { name: /archivos/i }),
    page.getByText('Archivos', { exact: true }),
    page.locator('a:has-text("Archivos")'),
    page.locator('[href*="archivo"]'),
  ];

  let clicked = false;
  for (const cand of archivosCandidates) {
    try {
      const count = await cand.count();
      if (count > 0) {
        console.log(`Found Archivos via candidate, count=${count}`);
        await cand.first().click({ timeout: 5000 });
        clicked = true;
        break;
      }
    } catch (e) { /* try next */ }
  }

  if (!clicked) {
    console.log('Could not find Archivos tab. Saving page HTML.');
    const html = await page.content();
    require('fs').writeFileSync('debug-page.html', html);
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'debug-archivos-tab.png', fullPage: true });

  console.log('\n=== STEP 4: EXTRACT FILE INFO ===');
  // Find all download links/buttons
  const downloadInfo = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a, button').forEach(el => {
      const href = el.href || el.getAttribute('href') || '';
      const text = (el.textContent || '').trim().slice(0, 100);
      const onclick = el.getAttribute('onclick') || '';
      if (href.includes('download') || href.includes('archivo') || href.includes('file') ||
          onclick.includes('download') || el.getAttribute('download') !== null) {
        results.push({ tag: el.tagName, href, text, onclick });
      }
    });
    return results;
  });

  console.log(`Found ${downloadInfo.length} potential download elements:`);
  console.log(JSON.stringify(downloadInfo, null, 2));

  console.log('\n=== STEP 5: NETWORK REQUESTS SUMMARY ===');
  const fileRequests = requests.filter(r =>
    r.url.includes('download') || r.url.includes('archivo') ||
    r.url.includes('.pdf') || r.url.includes('.jpg') || r.url.includes('.jpeg')
  );
  console.log(`File-related requests (${fileRequests.length}):`);
  fileRequests.forEach(r => console.log(`  ${r.method} ${r.url}`));

  console.log('\n=== KEEP BROWSER OPEN — INSPECT MANUALLY ===');
  console.log('Click on a download icon in the Archivos tab to see the URL pattern.');
  console.log('Press Ctrl+C in this terminal when done.');

  // Keep browser open for manual inspection
  await new Promise(() => {}); // wait forever
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
