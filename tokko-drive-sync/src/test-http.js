require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { login, getPropertyFiles, downloadFile } = require('./tokko-http');

async function main() {
  console.log('Logging in...');
  await login(process.env.TOKKO_EMAIL, process.env.TOKKO_PASSWORD);
  console.log('✓ Logged in');

  const propertyId = '8002445';

  console.log(`\nFetching files for property ${propertyId}...`);
  const files = await getPropertyFiles(propertyId);
  console.log(`✓ Found ${files.length} file(s):`);
  files.forEach(f => console.log(`  - [${f.id}] ${f.name} → ${f.url}`));

  if (files.length === 0) {
    console.log('No files to download.');
    return;
  }

  // Test download of first file
  const first = files[0];
  console.log(`\nDownloading: ${first.name} ...`);
  const buffer = await downloadFile(first.url);
  console.log(`✓ Downloaded ${buffer.length} bytes`);

  const outPath = path.join(__dirname, '..', `test-download-${first.name}`);
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ Saved to: ${outPath}`);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  if (err.response) console.error('Status:', err.response.status, JSON.stringify(err.response.data));
  process.exit(1);
});
