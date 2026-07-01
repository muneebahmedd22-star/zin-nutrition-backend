const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function findActiveLLM() {
  const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];
  for (const m of models) {
    try {
      console.log(`Testing LLM model: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent('Say hello');
      const text = await result.response.text();
      console.log(`SUCCESS: Model ${m} is active! Response:`, text.trim());
      return m;
    } catch (err) {
      console.error(`Failed with model ${m}:`, err.message);
    }
  }
}

findActiveLLM();
