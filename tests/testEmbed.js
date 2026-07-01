const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testDimensionality() {
  try {
    console.log('Testing gemini-embedding-001 with outputDimensionality: 768...');
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text: 'Hello fitness world' }] },
      outputDimensionality: 768
    });
    console.log('SUCCESS!');
    console.log('Embedding values length:', result.embedding.values.length);
  } catch (err) {
    console.error('FAILED to truncate embeddings:', err.message);
  }
}

testDimensionality();
