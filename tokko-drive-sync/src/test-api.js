require('dotenv').config();
const axios = require('axios');

const KEY = process.env.TOKKO_API_KEY;
const BASE = 'https://www.tokkobroker.com/api/v1';

async function test(path) {
  const url = `${BASE}${path}?key=${KEY}&format=json&limit=2`;
  console.log(`\nTesting: ${url}`);
  try {
    const res = await axios.get(url, { timeout: 15000 });
    console.log(`Status: ${res.status}`);
    console.log(`Fields: ${Object.keys(res.data).join(', ')}`);
    const items = res.data.objects || res.data.results || [];
    if (items.length > 0) {
      console.log(`First item fields: ${Object.keys(items[0]).join(', ')}`);
    }
  } catch (err) {
    console.log(`Error ${err.response?.status}: ${JSON.stringify(err.response?.data)}`);
  }
}

async function checkFiles() {
  const url = `${BASE}/property/?key=${KEY}&format=json&limit=20`;
  console.log('\n--- Checking "files" field on properties ---');
  try {
    const res = await axios.get(url, { timeout: 15000 });
    const items = res.data.objects || [];
    for (const prop of items) {
      if (prop.files && prop.files.length > 0) {
        console.log(`\nProperty ${prop.id} has ${prop.files.length} file(s):`);
        console.log(JSON.stringify(prop.files, null, 2));
        break;
      }
    }
    const withFiles = items.filter(p => p.files && p.files.length > 0);
    console.log(`\nProperties with files: ${withFiles.length}/${items.length}`);
    if (withFiles.length === 0) console.log('No files found in first 20 properties.');
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

async function checkSpecificProperty() {
  const url = `${BASE}/property/8002445/?key=${KEY}&format=json`;
  console.log('\n--- Property 8002445 files field ---');
  try {
    const res = await axios.get(url, { timeout: 15000 });
    const prop = res.data;
    console.log('files:', JSON.stringify(prop.files));
    console.log('photos count:', prop.photos?.length ?? 0);
    console.log('producer:', JSON.stringify(prop.producer));
    console.log('operations:', JSON.stringify(prop.operations));
    console.log('type:', JSON.stringify(prop.type));
    console.log('location:', JSON.stringify(prop.location));
  } catch (err) {
    console.log(`Error ${err.response?.status}: ${JSON.stringify(err.response?.data)}`);
  }
}

async function main() {
  await checkSpecificProperty();
  await checkFiles();
}

main();
