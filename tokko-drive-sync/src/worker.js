#!/usr/bin/env node
/**
 * tokko-drive-sync/src/worker.js
 * Standalone worker that runs OUTSIDE of Next.js.
 * Receives commands via stdin (JSON) and streams progress to stdout (JSON lines).
 * Called by Next.js via child_process.spawn().
 *
 * Commands:
 *   { "cmd": "sync", "config": {...}, "mode": "files"|"classify"|"folders", "agentFilter": null|string }
 *   { "cmd": "debug-files", "config": {...}, "propertyId": "7973079" }
 */

const path = require('path');
const SRC = __dirname;

require('dotenv').config({ path: path.join(SRC, '..', '.env') });

const tokkoHttp = require('./tokko-http.js');
const tokko    = require('./tokko.js');
const drive    = require('./drive.js');
const location = require('./location.js');
const classifier = require('./classifier.js');

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function runSync(config, mode, agentFilter) {
  send({ type: 'start', message: 'Obteniendo propiedades de Tokko Broker...' });
  const properties = await tokko.getAllProperties(config.tokkoApiKey);

  const byAgent = {};
  for (const prop of properties) {
    const name = tokko.getAgentName(prop);
    if (!byAgent[name]) byAgent[name] = [];
    byAgent[name].push(prop);
  }

  send({ type: 'progress', message: 'Conectando con Google Drive...' });
  const driveClient = await drive.getDrive(config.oauthClientPath);

  if (mode === 'files' || mode === 'classify') {
    if (config.tokkoEmail && config.tokkoPassword) {
      send({ type: 'progress', message: 'Iniciando sesión en Tokko...' });
      await tokkoHttp.login(config.tokkoEmail, config.tokkoPassword);
      send({ type: 'progress', message: '✓ Login Tokko OK' });
    }
  }

  let totalNew = 0, totalCreated = 0, totalUploaded = 0, totalClassified = 0;

  // Map existing Drive folders
  send({ type: 'progress', message: 'Mapeando estructura actual en Drive...' });
  const globalDriveProps = new Map();
  const agentsRes = await driveClient.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${config.rootFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 100,
  });

  const agentFoldersCache = new Map();
  for (const agent of (agentsRes.data.files || [])) {
    agentFoldersCache.set(agent.name, agent.id);
    let pageToken;
    do {
      const propsRes = await driveClient.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and '${agent.id}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name)',
        pageSize: 1000,
        pageToken,
      });
      for (const file of (propsRes.data.files || [])) {
        const propId = file.name.split(' - ')[0]?.trim();
        if (propId && /^\d+$/.test(propId) && !globalDriveProps.has(propId)) {
          globalDriveProps.set(propId, { folderId: file.id, parentFolderId: agent.id, name: file.name });
        }
      }
      pageToken = propsRes.data.nextPageToken;
    } while (pageToken);
  }

  const agentEntries = Object.entries(byAgent).filter(([name]) =>
    !agentFilter || name.toLowerCase().includes(agentFilter.toLowerCase())
  );

  for (const [, agentProps] of agentEntries) {
    const newProps = agentProps.filter(p => !globalDriveProps.has(String(p.id)));
    totalNew += newProps.length;
  }

  send({ type: 'start', message: `${totalNew} propiedades completamente nuevas detectadas`, total: totalNew });

  let current = 0;

  for (const [agentName, agentProps] of agentEntries) {
    let agentFolderId = agentFoldersCache.get(agentName);
    if (!agentFolderId) {
      agentFolderId = await drive.findOrCreateFolder(driveClient, agentName, config.rootFolderId);
      agentFoldersCache.set(agentName, agentFolderId);
    }

    for (const prop of agentProps) {
      current++;
      const resolvedLocation = await location.extractLocation(prop);
      const folderName = tokko.buildFolderName(prop, resolvedLocation);
      const propIdStr = String(prop.id);
      let propFolderId;
      const existingGlobal = globalDriveProps.get(propIdStr);

      if (existingGlobal) {
        propFolderId = existingGlobal.folderId;

        if (existingGlobal.parentFolderId !== agentFolderId) {
          send({ type: 'warning', message: `Moviendo propiedad ${prop.id} hacia ${agentName}` });
          await driveClient.files.update({
            fileId: existingGlobal.folderId,
            addParents: agentFolderId,
            removeParents: existingGlobal.parentFolderId,
          });
          existingGlobal.parentFolderId = agentFolderId;
        }

        if (existingGlobal.name !== folderName) {
          send({ type: 'progress', message: `Renombrando: ${existingGlobal.name} → ${folderName}` });
          await driveClient.files.update({
            fileId: existingGlobal.folderId,
            requestBody: { name: folderName },
          });
          existingGlobal.name = folderName;
        }

        if (mode === 'folders') continue;
      } else {
        send({ type: 'progress', step: 'folder', message: `Creando nueva carpeta: ${folderName}`, current, total: totalNew });
        propFolderId = await drive.findOrCreateFolder(driveClient, folderName, agentFolderId);
        totalCreated++;
        globalDriveProps.set(propIdStr, { folderId: propFolderId, parentFolderId: agentFolderId, name: folderName });
      }

      if (mode === 'files' || mode === 'classify') {
        try {
          const files = await tokkoHttp.getPropertyFiles(prop.id);
          if (files.length === 0) {
            send({ type: 'warning', message: `Propiedad ${prop.id}: 0 archivos en Tokko.` });
          } else {
            send({ type: 'progress', step: 'files', message: `${files.length} archivo(s) encontrado(s) en propiedad ${prop.id}` });
            for (const file of files) {
              try {
                const buffer = await tokkoHttp.downloadFile(file.url);
                let uploadName = file.name;

                if (mode === 'classify') {
                  const result = await classifier.classifyFile(file.name, buffer);
                  uploadName = result.nombre_sugerido;
                  send({ type: 'progress', step: 'classify', message: `[${result.confianza}%] ${result.categoria}/${result.tipo_doc} → ${uploadName}` });
                  if (result.requiere_revision) {
                    send({ type: 'warning', message: `Revisión manual: ${file.name} (${result.nota || 'baja confianza'})` });
                  }
                  totalClassified++;
                }

                const uploadedId = await drive.uploadFile(driveClient, uploadName, buffer, null, propFolderId);
                if (uploadedId) {
                  totalUploaded++;
                  send({ type: 'progress', step: 'upload', message: `✓ Subido: ${uploadName}` });
                } else {
                  send({ type: 'progress', step: 'skip', message: `Ya existe en Drive: ${uploadName}` });
                }
              } catch (fileErr) {
                send({ type: 'error', message: `Error descargando ${file.name}: ${fileErr.message}` });
              }
            }
          }
        } catch (filesErr) {
          send({ type: 'error', message: `Error obteniendo archivos de propiedad ${prop.id}: ${filesErr.message}` });
        }
      }
    }
  }

  send({ type: 'done', message: 'Sincronización completada', created: totalCreated, uploaded: totalUploaded, classified: totalClassified, current: totalNew, total: totalNew });
}

async function runDebugFiles(config, propertyId) {
  send({ type: 'progress', message: `Login en Tokko...` });
  tokkoHttp.resetLogin();
  await tokkoHttp.login(config.tokkoEmail, config.tokkoPassword);
  const session = await tokkoHttp.inspectSession();
  send({ type: 'progress', message: `Login OK. Cookies: ${session.cookies.map(c => c.key).join(', ')}` });

  const files = await tokkoHttp.getPropertyFiles(propertyId);
  send({ type: 'done', message: `${files.length} archivos encontrados`, files });
}

// ─── Main: read command from stdin ────────────────────────────────────────────
async function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    raw += chunk;
  }

  let cmd;
  try {
    cmd = JSON.parse(raw);
  } catch (e) {
    send({ type: 'error', message: `Comando JSON inválido: ${e.message}` });
    process.exit(1);
  }

  try {
    if (cmd.cmd === 'sync') {
      await runSync(cmd.config, cmd.mode, cmd.agentFilter || null);
    } else if (cmd.cmd === 'debug-files') {
      await runDebugFiles(cmd.config, cmd.propertyId);
    } else {
      send({ type: 'error', message: `Comando desconocido: ${cmd.cmd}` });
    }
  } catch (err) {
    send({ type: 'error', message: `Error fatal: ${err.message}` });
  }

  process.exit(0);
}

main();
