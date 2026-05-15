const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TOKKO_URL = 'https://www.tokkobroker.com';
let _browser = null;
let _page = null;

async function getBrowser() {
  if (!_browser) {
    _browser = await chromium.launch({ headless: false, slowMo: 200 });
  }
  return _browser;
}

async function getPage() {
  if (!_page) {
    const browser = await getBrowser();
    _page = await browser.newPage();
  }
  return _page;
}

async function login(email, password) {
  const page = await getPage();
  console.log('  [Scraper] Opening Tokko Broker login...');

  await page.goto(`${TOKKO_URL}/not_connected/?next=/home`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[placeholder="Usuario"]', { timeout: 15000 });

  await page.fill('input[placeholder="Usuario"]', email);
  await page.fill('input[placeholder="Contraseña"]', password);

  // Check terms checkboxes if not already checked
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  for (const cb of checkboxes) {
    const checked = await cb.isChecked();
    if (!checked) await cb.check();
  }

  await page.click('button:has-text("Acceder"), input[value="Acceder"]');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  console.log('  [Scraper] Logged in. URL:', page.url());
}

async function getFilesForProperty(propertyId) {
  const page = await getPage();
  const files = [];

  try {
    await page.goto(`${TOKKO_URL}/property/${propertyId}/`, { waitUntil: 'networkidle', timeout: 20000 });

    // Click "Archivos" tab
    const archivosTab = page.locator('text=Archivos').first();
    await archivosTab.click();
    await page.waitForTimeout(1500);

    // Intercept downloads by finding download buttons and extracting URLs
    // Try to find file rows — collect name + download URL
    const fileRows = await page.locator('.property-file, [class*="file-row"], [class*="file-item"]').all();

    if (fileRows.length > 0) {
      for (const row of fileRows) {
        const name = await row.locator('[class*="name"], .filename, span').first().textContent().catch(() => '');
        const downloadBtn = row.locator('a[href*="download"], a[download], button').first();
        const href = await downloadBtn.getAttribute('href').catch(() => null);
        if (href) files.push({ name: name.trim(), url: href.startsWith('http') ? href : `${TOKKO_URL}${href}` });
      }
    } else {
      // Fallback: find all links/buttons in the files section
      const downloadLinks = await page.locator('a[href*="/download"], a[download]').all();
      for (const link of downloadLinks) {
        const href = await link.getAttribute('href');
        const text = await link.textContent().catch(() => '');
        if (href) files.push({
          name: text.trim() || path.basename(href),
          url: href.startsWith('http') ? href : `${TOKKO_URL}${href}`,
        });
      }
    }
  } catch (err) {
    console.error(`  [Scraper] Error fetching files for property ${propertyId}: ${err.message}`);
  }

  return files;
}

async function downloadFile(page, fileUrl, fileName) {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, fileName);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
    page.goto(fileUrl).catch(() => {}),
  ]);

  if (download) {
    await download.saveAs(filePath);
    const buffer = fs.readFileSync(filePath);
    fs.unlinkSync(filePath);
    return buffer;
  }

  // Fallback: fetch directly with session cookies
  const cookies = await page.context().cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const axios = require('axios');
  const res = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { Cookie: cookieStr },
  });
  return Buffer.from(res.data);
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
    _page = null;
  }
}

module.exports = { login, getFilesForProperty, downloadFile, closeBrowser, getPage };
