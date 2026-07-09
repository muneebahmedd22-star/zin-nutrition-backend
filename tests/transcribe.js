const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../src/config');

if (!config.geminiApiKey) {
  console.error('ERROR: GEMINI_API_KEY is not defined in config.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

async function transcribeAudio() {
  try {
    const audioPath = 'C:\\Users\\Dell\\Downloads\\WhatsApp Ptt 2026-07-09 at 8.20.20 PM.ogg';
    
    if (!fs.existsSync(audioPath)) {
      console.error(`Audio file not found at: ${audioPath}`);
      return;
    }

    console.log('Loading audio file...');
    const audioBuffer = fs.readFileSync(audioPath);
    const base64Audio = audioBuffer.toString('base64');

    console.log('Sending to Gemini 2.5 Flash for transcription and summary...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    console.log('\n=== GEMINI RESPONSE ===');
    console.log(result.response.text());
    console.log('=======================\n');

  } catch (error) {
    console.error('Transcription error:', error.message);
  }
}

transcribeAudio();
