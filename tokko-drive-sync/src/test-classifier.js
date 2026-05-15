require('dotenv').config();
const { login, getPropertyFiles, downloadFile } = require('./tokko-http');
const { classifyFile } = require('./classifier');

async function main() {
  console.log('Logging in to Tokko...');
  await login(process.env.TOKKO_EMAIL, process.env.TOKKO_PASSWORD);
  console.log('✓ Logged in\n');

  const propertyId = process.argv[2] || '8002445';

  console.log(`Fetching files for property ${propertyId}...`);
  const files = await getPropertyFiles(propertyId);
  console.log(`Found ${files.length} file(s)\n`);

  for (const file of files) {
    console.log(`--- ${file.name} ---`);
    console.log('Downloading...');
    const buffer = await downloadFile(file.url);
    console.log(`Downloaded ${buffer.length} bytes`);

    console.log('Classifying with Gemini...');
    const result = await classifyFile(file.name, buffer);
    console.log(JSON.stringify(result, null, 2));
    console.log('');
  }
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
