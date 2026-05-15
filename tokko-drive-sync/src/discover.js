/**
 * Discovery script — runs Playwright ONCE in headless mode
 * to capture Tokko's internal login flow and file download patterns.
 * Output: discovery-output.json with all the data needed to build
 * a pure-axios scraper.
 */
require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EMAIL = process.env.TOKKO_EMAIL;
const PASSWORD = process.env.TOKKO_PASSWORD;
const PROPERTY_ID = '8002445';
const OUTPUT_FILE = path.join(__dirname, '..', 'discovery-output.json');

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Missing TOKKO_EMAIL or TOKKO_PASSWORD in .env');
    process.exit(1);
  }

  console.log('Starting discovery (headless, ~30s)...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const captured = {
    loginPosts: [],
    propertyRequests: [],
    archivosRequests: [],
    downloadRequests: [],
    archivosHtml: null,
    cookiesAfterLogin: null,
    finalUrl: null,
  };

  let phase = 'init';

  page.on('request', req => {
    const entry = {
      method: req.method(),
      url: req.url(),
      headers: req.headers(),
      postData: req.postData(),
    };
    if (phase === 'login') captured.loginPosts.push(entry);
    if (phase === 'property') captured.propertyRequests.push(entry);
    if (phase === 'archivos') captured.archivosRequests.push(entry);
    if (phase === 'download') captured.downloadRequests.push(entry);
  });

  page.on('response', async resp => {
    const ct = resp.headers()['content-type'] || '';
    if (ct.includes('pdf') || ct.includes('image/jpeg') || ct.includes('octet-stream') || ct.includes('attachment')) {
      const entry = {
        url: resp.url(),
        status: resp.status(),
        headers: resp.headers(),
        phase,
      };
      captured.downloadRequests.push(entry);
    }
  });

  // ===== STEP 1: LOGIN =====
  console.log('[1/4] Login...');
  phase = 'login';
  await page.goto('https://www.tokkobroker.com/login/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.getByPlaceholder('Usuario').fill(EMAIL);
  await page.getByPlaceholder('Contraseña').fill(PASSWORD);

  const cbs = await page.locator('input[type="checkbox"]').all();
  for (const cb of cbs) {
    if (!(await cb.isChecked())) await cb.check();
  }

  await page.screenshot({ path: path.join(__dirname, '..', 'before-click.png') });

  // Try multiple selectors for the Acceder button
  const btnSelectors = [
    'button:has-text("Acceder")',
    'input[type="submit"][value*="Acceder" i]',
    'input[type="submit"]',
    'button[type="submit"]',
    'a:has-text("Acceder")',
    '[class*="login"] button',
    '[class*="submit"]',
  ];

  let clicked = false;
  for (const sel of btnSelectors) {
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0 && (await loc.isVisible())) {
        console.log(`  Clicking with selector: ${sel}`);
        await loc.click({ timeout: 5000 });
        clicked = true;
        break;
      }
    } catch (e) { /* try next */ }
  }

  if (!clicked) {
    // Last resort: press Enter on password field
    console.log('  No button found — pressing Enter on password field');
    await page.locator('input[type="password"]').press('Enter');
  }

  await page.waitForURL(
    url => !url.toString().includes('not_connected') && !url.toString().includes('/login'),
    { timeout: 20000 }
  ).catch(() => {});

  await page.waitForTimeout(2000);
  captured.finalUrl = page.url();

  if (captured.finalUrl.includes('login') || captured.finalUrl.includes('not_connected')) {
    console.error('LOGIN FAILED. Final URL:', captured.finalUrl);
    await page.screenshot({ path: path.join(__dirname, '..', 'login-fail.png') });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(captured, null, 2));
    await browser.close();
    process.exit(1);
  }

  captured.cookiesAfterLogin = await context.cookies();
  console.log('  Login OK. Cookies captured:', captured.cookiesAfterLogin.length);

  // ===== STEP 2: NAVIGATE TO PROPERTY =====
  console.log('[2/4] Navigate to property', PROPERTY_ID);
  phase = 'property';
  await page.goto(`https://www.tokkobroker.com/property/${PROPERTY_ID}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ===== STEP 3: CLICK ARCHIVOS =====
  console.log('[3/4] Click Archivos tab...');
  phase = 'archivos';

  let archivosFound = false;
  const candidates = [
    page.getByRole('tab', { name: /archivos/i }),
    page.getByRole('link', { name: /archivos/i }),
    page.locator('a:has-text("Archivos")'),
    page.getByText('Archivos', { exact: true }),
  ];
  for (const cand of candidates) {
    try {
      if ((await cand.count()) > 0) {
        await cand.first().click({ timeout: 5000 });
        archivosFound = true;
        break;
      }
    } catch {}
  }

  if (!archivosFound) console.log('  WARNING: Archivos tab not found');
  await page.waitForTimeout(3000);

  captured.archivosHtml = await page.content();
  fs.writeFileSync(path.join(__dirname, '..', 'archivos-page.html'), captured.archivosHtml);

  // ===== STEP 4: TRY TO CLICK A DOWNLOAD =====
  console.log('[4/4] Looking for download links...');
  phase = 'download';

  // Find all anchor/button elements that look like file downloads
  const downloadLinks = await page.evaluate(() => {
    const found = [];
    document.querySelectorAll('a, button').forEach(el => {
      const href = el.getAttribute('href') || '';
      const onclick = el.getAttribute('onclick') || '';
      const text = (el.textContent || '').trim();
      const cls = el.className || '';
      const hasDownloadAttr = el.hasAttribute('download');
      const looksLikeFile = href.match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i) ||
                            href.includes('/download') || href.includes('/file/') ||
                            href.includes('/archivo') || onclick.includes('download') ||
                            cls.includes('download') || hasDownloadAttr;
      if (looksLikeFile) {
        found.push({
          tag: el.tagName,
          href,
          onclick,
          text: text.slice(0, 80),
          className: typeof cls === 'string' ? cls : '',
          download: el.getAttribute('download'),
        });
      }
    });
    return found;
  });

  captured.downloadCandidates = downloadLinks;
  console.log(`  Found ${downloadLinks.length} potential download elements`);

  // Try to click first download to capture its URL
  if (downloadLinks.length > 0) {
    const first = downloadLinks[0];
    console.log('  Clicking first download:', first.href || first.text);
    try {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await page.evaluate((idx) => {
        const els = document.querySelectorAll('a, button');
        let count = 0;
        for (const el of els) {
          const href = el.getAttribute('href') || '';
          const onclick = el.getAttribute('onclick') || '';
          const cls = el.className || '';
          const hasDl = el.hasAttribute('download');
          const looks = href.match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i) ||
                        href.includes('/download') || href.includes('/file/') ||
                        href.includes('/archivo') || onclick.includes('download') ||
                        cls.includes('download') || hasDl;
          if (looks) {
            if (count === idx) { el.click(); return; }
            count++;
          }
        }
      }, 0);

      const dl = await downloadPromise.catch(() => null);
      if (dl) {
        captured.downloadCapturedUrl = dl.url();
        captured.downloadSuggestedFilename = dl.suggestedFilename();
        console.log('  ✓ Download captured. URL:', dl.url());
      } else {
        console.log('  No download event fired (might be inline link)');
      }
    } catch (err) {
      console.log('  Could not trigger download:', err.message);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(captured, null, 2));
  console.log(`\nDone. Discovery saved to: ${OUTPUT_FILE}`);
  console.log(`Archivos HTML saved to: archivos-page.html`);

  await browser.close();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
