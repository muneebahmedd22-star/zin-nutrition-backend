const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function transcribe() {
  const audioPath = "C:\\Users\\Dell\\Downloads\\WhatsApp Ptt 2026-07-03 at 3.43.29 PM.ogg";
  if (!fs.existsSync(audioPath)) {
    console.error('Audio file not found at:', audioPath);
    return;
  }
  
  const audioData = fs.readFileSync(audioPath);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  console.log('Sending audio voice note to Gemini for transcription...');
  const result = await model.generateContent([
    {
      inlineData: {
        data: Buffer.from(audioData).toString("base64"),
        mimeType: "audio/ogg"
      }
    },
    "Transcribe this audio file verbatim in its original language (Hindi/Urdu/Hinglish/English)."
  ]);
  
  console.log('\n--- TRANSCRIPT START ---');
  console.log(result.response.text().trim());
  console.log('--- TRANSCRIPT END ---\n');
}

transcribe().catch(console.error);
