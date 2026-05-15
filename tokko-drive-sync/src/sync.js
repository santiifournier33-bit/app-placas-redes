require('dotenv').config();
const { getAllProperties, buildFolderName, getAgentName } = require('./tokko');
const { extractLocation } = require('./location');
const { getDrive, findOrCreateFolder, uploadFile } = require('./drive');
const { login: tokkoLogin, getPropertyFiles, downloadFile } = require('./tokko-http');
const { classifyFile } = require('./classifier');

const TOKKO_API_KEY = process.env.TOKKO_API_KEY;
const TOKKO_EMAIL = process.env.TOKKO_EMAIL;
const TOKKO_PASSWORD = process.env.TOKKO_PASSWORD;
const OAUTH_CLIENT_PATH = process.env.OAUTH_CLIENT_PATH || './oauth-client.json';
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

const withFiles = process.argv.includes('--with-files');
const backfillFiles = process.argv.includes('--backfill-files');
const classifyFiles = process.argv.includes('--classify');

const isDryRun = process.argv.includes('--dry-run');
const agentFilter = (() => {
  const idx = process.argv.indexOf('--agent');
  return idx !== -1 ? process.argv[idx + 1]?.toLowerCase() : null;
})();

function validate() {
  if (!TOKKO_API_KEY) throw new Error('Missing TOKKO_API_KEY in .env');
  if (!ROOT_FOLDER_ID) throw new Error('Missing GOOGLE_DRIVE_ROOT_FOLDER_ID in .env');
  if ((withFiles || backfillFiles) && (!process.env.TOKKO_EMAIL || !process.env.TOKKO_PASSWORD)) {
    throw new Error('Missing TOKKO_EMAIL or TOKKO_PASSWORD in .env (required for --with-files / --backfill-files)');
  }
  if (classifyFiles && !process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in .env (required for --classify)');
  }
}

// Returns Map<propertyId (string) → Drive folderId>
async function getExistingPropertyFolders(drive, agentFolderId) {
  const existing = new Map();
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and '${agentFolderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 1000,
      pageToken: pageToken || undefined,
    });

    for (const file of res.data.files) {
      const propId = file.name.split(' - ')[0].trim();
      if (/^\d+$/.test(propId)) existing.set(propId, file.id);
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return existing;
}

async function getAgentFolderIdIfExists(drive, agentName) {
  const res = await drive.files.list({
    q: `name='${agentName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${ROOT_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
  });
  return res.data.files[0]?.id || null;
}

async function syncFilesToFolder(drive, propertyId, folderId) {
  const files = await getPropertyFiles(propertyId);
  if (files.length === 0) {
    console.log(`    [${propertyId}] No files in Archivos.`);
    return;
  }
  console.log(`    [${propertyId}] ${files.length} file(s) found`);
  for (const file of files) {
    try {
      const buffer = await downloadFile(file.url);

      let uploadName = file.name;
      if (classifyFiles) {
        const result = await classifyFile(file.name, buffer);
        uploadName = result.nombre_sugerido;
        console.log(`      [${result.confianza}%] ${result.categoria}/${result.tipo_doc} → ${uploadName}`);
        if (result.requiere_revision) {
          console.warn(`      ⚠ REVISIÓN MANUAL NECESARIA: ${result.nota || 'baja confianza'}`);
        }
      }

      const uploadedId = await uploadFile(drive, uploadName, buffer, null, folderId);
      if (uploadedId) console.log(`      ✓ Uploaded: ${uploadName}`);
      else console.log(`      - Already exists: ${uploadName}`);
    } catch (err) {
      console.error(`      ✗ Error with ${file.name}: ${err.message}`);
    }
  }
}

async function main() {
  validate();

  if (isDryRun) console.log('--- DRY RUN MODE: no changes will be made ---\n');
  if (agentFilter) console.log(`--- Filtering by agent: "${agentFilter}" ---\n`);

  const properties = await getAllProperties(TOKKO_API_KEY);

  const byAgent = {};
  for (const prop of properties) {
    const agentName = getAgentName(prop);
    if (!byAgent[agentName]) byAgent[agentName] = [];
    byAgent[agentName].push(prop);
  }

  console.log(`\nAgents found: ${Object.keys(byAgent).join(', ')}\n`);

  // Always connect to Drive (needed to read existing folders)
  const drive = await getDrive(OAUTH_CLIENT_PATH);

  // Login to Tokko via HTTP if files needed
  if ((withFiles || backfillFiles) && !isDryRun) {
    console.log('Logging in to Tokko...');
    await tokkoLogin(TOKKO_EMAIL, TOKKO_PASSWORD);
    console.log('✓ Tokko login OK');
  }

  for (const [agentName, agentProperties] of Object.entries(byAgent)) {
    if (agentFilter && !agentName.toLowerCase().includes(agentFilter)) continue;

    // Read existing property folders from Drive (id → folderId map)
    const existingAgentFolderId = await getAgentFolderIdIfExists(drive, agentName);
    const existingFolders = existingAgentFolderId
      ? await getExistingPropertyFolders(drive, existingAgentFolderId)
      : new Map();

    const newProperties = agentProperties.filter(p => !existingFolders.has(String(p.id)));
    const skipped = agentProperties.length - newProperties.length;

    console.log(`\nAgent: ${agentName} — ${newProperties.length} new, ${skipped} already exist`);

    // Only create agent folder if there are new properties to add
    let agentFolderId = existingAgentFolderId;
    if (!isDryRun && !agentFolderId && newProperties.length > 0) {
      agentFolderId = await findOrCreateFolder(drive, agentName, ROOT_FOLDER_ID);
    }

    // --- Create new property folders ---
    for (const prop of newProperties) {
      const resolvedLocation = await extractLocation(prop);
      const folderName = buildFolderName(prop, resolvedLocation);
      console.log(`  + Creating: ${folderName}`);

      if (isDryRun) continue;

      const propFolderId = await findOrCreateFolder(drive, folderName, agentFolderId);
      existingFolders.set(String(prop.id), propFolderId);

      if (withFiles) {
        await syncFilesToFolder(drive, prop.id, propFolderId);
      }
    }

    // --- Backfill files into existing folders ---
    if (backfillFiles && !isDryRun) {
      const existingProps = agentProperties.filter(p => existingFolders.has(String(p.id)) && !newProperties.includes(p));
      console.log(`  Backfilling files for ${existingProps.length} existing properties...`);
      for (const prop of existingProps) {
        const propFolderId = existingFolders.get(String(prop.id));
        await syncFilesToFolder(drive, prop.id, propFolderId);
      }
    }
  }

  console.log('\nSync completed.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
