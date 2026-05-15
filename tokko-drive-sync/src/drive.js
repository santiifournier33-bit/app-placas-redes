const { google } = require('googleapis');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const TOKEN_PATH = path.join(__dirname, '..', 'oauth-token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

let _drive = null;

async function getDrive(oauthClientPath) {
  if (_drive) return _drive;

  const credentials = JSON.parse(fs.readFileSync(oauthClientPath, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000');

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(token);
    oauth2Client.on('tokens', updated => {
      const merged = { ...token, ...updated };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
    });
  } else {
    const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    console.log('\n=== AUTORIZACIÓN REQUERIDA ===');
    console.log('Abriendo navegador para autorizar acceso a Google Drive...');
    console.log('Si no se abre, entrá manualmente a esta URL:\n');
    console.log(authUrl);
    console.log('\n');

    exec(`start "" "${authUrl}"`);

    const code = await waitForAuthCode();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('✓ Autorización guardada. Próximas ejecuciones serán automáticas.\n');
  }

  _drive = google.drive({ version: 'v3', auth: oauth2Client });
  return _drive;
}

function waitForAuthCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3000');
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
    server.listen(3000, () => {});
    server.on('error', reject);
  });
}

const folderCache = new Map();

async function findOrCreateFolder(drive, name, parentId) {
  const cacheKey = `${parentId}::${name}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey);

  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (res.data.files.length > 0) {
    const id = res.data.files[0].id;
    folderCache.set(cacheKey, id);
    return id;
  }

  const propertyId = name.split(' - ')[0];
  if (propertyId && /^\d+$/.test(propertyId)) {
    const resById = await drive.files.list({
      q: `name contains '${propertyId}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 1,
    });

    if (resById.data.files.length > 0) {
      const existing = resById.data.files[0];
      if (existing.name !== name) {
        console.log(`  Renaming: "${existing.name}" → "${name}"`);
        await drive.files.update({ fileId: existing.id, requestBody: { name } });
      }
      folderCache.set(cacheKey, existing.id);
      return existing.id;
    }
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  const id = created.data.id;
  folderCache.set(cacheKey, id);
  return id;
}

async function fileExistsInFolder(drive, fileName, folderId) {
  const res = await drive.files.list({
    q: `name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
  });
  return res.data.files.length > 0;
}

async function uploadFile(drive, fileName, fileBuffer, mimeType, folderId) {
  const alreadyExists = await fileExistsInFolder(drive, fileName, folderId);
  if (alreadyExists) {
    return null;
  }

  const stream = Readable.from(fileBuffer);
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    },
    fields: 'id, name',
  });

  return res.data.id;
}

module.exports = { getDrive, findOrCreateFolder, uploadFile };
