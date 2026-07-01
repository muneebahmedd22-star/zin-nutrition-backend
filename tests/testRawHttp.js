const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const key = process.env.GEMINI_API_KEY;

async function listV1Models() {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
  console.log(`Listing v1 models via: ${url}`);
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status Code: ${res.status}`);
    console.log('Models listed:', data.models ? data.models.map(m => m.name) : 'None');
  } catch (err) {
    console.error('Error during list:', err.message);
  }
}

listV1Models();
