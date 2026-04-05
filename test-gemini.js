const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const apiKey = env.split('\n').find(line => line.startsWith('GEMINI_API_KEY=')).split('=')[1].trim();

fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey)
  .then(res => res.json())
  .then(data => {
    console.log(data.models.map(m => m.name).join('\n'));
  });
