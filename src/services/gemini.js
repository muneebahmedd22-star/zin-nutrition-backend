const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

let genAI;
if (config.geminiApiKey) {
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
} else {
  console.warn('WARNING: GEMINI_API_KEY is not defined in environment variables.');
}

/**
 * Generate vector embedding for text using text-embedding-004 (768 dimensions)
 * @param {string} text - The input text to embed
 * @returns {Promise<number[]>} - The 768-dimension embedding array
 */
async function generateEmbedding(text) {
  if (!genAI) {
    throw new Error('Gemini API client not initialized. Check GEMINI_API_KEY.');
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent({
    content: { parts: [{ text: text }] },
    outputDimensionality: 768
  });
  if (result && result.embedding && result.embedding.values) {
    return result.embedding.values;
  }
  throw new Error('Failed to generate embedding from Gemini API.');
}

/**
 * Generate content using gemini-1.5-flash with structured guidelines
 * @param {string} prompt - Prompt including query details and context
 * @param {string} systemInstruction - Instructions guiding the model behaviour (hallucination protection)
 * @returns {Promise<string>} - The model generated output
 */
async function generateTrainingProgram(prompt, systemInstruction) {
  if (!genAI) {
    throw new Error('Gemini API client not initialized. Check GEMINI_API_KEY.');
  }
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

module.exports = {
  generateEmbedding,
  generateTrainingProgram
};
