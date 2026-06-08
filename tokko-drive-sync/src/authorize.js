/**
 * Standalone OAuth re-authorization for the Google Drive WRITE path (sync).
 *
 * Run:  node src/authorize.js
 *
 * Regenerates oauth-token.json by opening a browser consent flow.
 * Listens on a free loopback port (NOT 3000) so it never collides with `next dev`.
 * Uses access_type=offline + prompt=consent to guarantee a fresh refresh_token.
 *
 * Note: to stop the refresh_token from dying every ~7 days, the OAuth consent
 * screen must also be published to "Production" in Google Cloud Console.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const CLIENT_PATH = path.join(__dirname, '..', 'oauth-client.json');
const TOKEN_PATH = path.join(__dirname, '..', 'oauth-token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const PORT = 4100; // free loopback port, avoids clash with next dev (3000)
const REDIRECT_URI = `http://localhost:${PORT}`;

function waitForAuthCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get('code');
      if (code) {
        res.end('<h2>✓ Autorización exitosa. Podés cerrar esta pestaña.</h2>');
        server.close();
        resolve(code);
      } else {
        res.end('<h2>Error: no se recibió código. Intentá de nuevo.</h2>');
        server.close();
        reject(new Error('No auth code received'));
      }
    });
    server.listen(PORT, () => {});
    server.on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(CLIENT_PATH)) {
    console.error(`No se encontró ${CLIENT_PATH}`);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CLIENT_PATH, 'utf8'));
  const { client_id, client_secret } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n=== RE-AUTORIZACIÓN GOOGLE DRIVE (sync/escritura) ===');
  console.log('Abriendo navegador. Si no abre, entrá manualmente a:\n');
  console.log(authUrl + '\n');
  exec(`start "" "${authUrl}"`);

  const code = await waitForAuthCode();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error('⚠ No se recibió refresh_token. Revocá el acceso previo en https://myaccount.google.com/permissions y reintentá.');
  }

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`✓ Token guardado en ${TOKEN_PATH}`);
  console.log('Recordá: publicá la pantalla de consentimiento a "Production" para que no expire a los 7 días.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error en autorización:', err.message);
  process.exit(1);
});
