const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../src/config');

if (!config.geminiApiKey) {
  console.error('ERROR: GEMINI_API_KEY is not defined.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

async function transcribeNew() {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const filePath = 'C:\\Users\\Dell\\Downloads\\WhatsApp Ptt 2026-07-10 at 7.46.46 PM.ogg';

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  try {
    const audioBuffer = fs.readFileSync(filePath);
    const base64Audio = audioBuffer.toString('base64');
    
    const prompt = 'Transcribe this voice message exactly (it is likely in Hindi/Urdu/English). Then explain clearly in Roman Urdu what the client wants.';
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/ogg',
          data: base64Audio
        }
      },
      prompt
    ]);
    
    console.log('\n=== GEMINI TRANSCRIPTION RESPONSE ===');
    console.log(result.response.text());
    console.log('=====================================\n');
  } catch (err) {
    console.error('Error transcribing file:', err.message);
  }
}

transcribeNew();
