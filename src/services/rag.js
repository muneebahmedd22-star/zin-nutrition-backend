const supabase = require('../config/db');
const { generateEmbedding } = require('./gemini');
const config = require('../config');

/**
 * Split text into chunks with specified size and overlap
 * @param {string} text - Ebook full text
 * @param {number} chunkSize - Max characters per chunk (default 1000)
 * @param {number} overlap - Overlapping character count (default 200)
 * @returns {string[]} - Array of chunk strings
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text) return [];
  // Strip null bytes to prevent PostgreSQL 'unsupported Unicode escape sequence' errors
  const cleanedText = text.replace(/\x00/g, '').replace(/\s+/g, ' ').trim();
  const chunks = [];
  let index = 0;

  while (index < cleanedText.length) {
    const end = Math.min(index + chunkSize, cleanedText.length);
    chunks.push(cleanedText.slice(index, end));
    index += (chunkSize - overlap);
    if (end === cleanedText.length) break;
  }
  return chunks;
}

/**
 * Clean & chunk text, embed it, and insert into Supabase
 * @param {string} ebookId - UUID of the ebook record
 * @param {string} fullText - Extracted text content of the PDF
 */
async function embedAndStoreEbook(ebookId, fullText) {
  const chunks = chunkText(fullText, 1000, 200);
  console.log(`Text split into ${chunks.length} chunks. Starting batch processing...`);
  
  await supabase.from('ebooks').update({ status: 'processing', chunk_count: chunks.length }).eq('id', ebookId);

  const delay = ms => new Promise(res => setTimeout(res, ms));

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      
      // Delay to avoid hitting API rate limits (800ms)
      await delay(800);
      
      const embedding = await generateEmbedding(chunkText);
      
      const { error } = await supabase.from('ebook_chunks').insert({
        ebook_id: ebookId,
        content: chunkText,
        embedding: embedding,
        metadata: { index: i, total_chunks: chunks.length }
      });

      if (error) {
        throw new Error(`Supabase insert failed: ${error.message}`);
      }

      // Log progress every 20 chunks
      if ((i + 1) % 20 === 0 || (i + 1) === chunks.length) {
        console.log(`[Batch Progress] Embedded and stored chunk ${i + 1}/${chunks.length} (${Math.round(((i + 1) / chunks.length) * 100)}%)`);
      }
    }

    await supabase.from('ebooks').update({
      status: 'completed',
      last_processed_at: new Date().toISOString()
    }).eq('id', ebookId);

  } catch (error) {
    console.error('Error during embedding pipeline:', error);
    await supabase.from('ebooks').update({ status: 'failed' }).eq('id', ebookId);
    throw error;
  }
}

/**
 * Searches the Supabase vector database for relevant ebook chunks matching the query
 * @param {string} queryText - The search query (e.g. "Fat Loss 3 day split")
 * @returns {Promise<string[]>} - The matching chunk texts
 */
async function searchKnowledgeBase(queryText) {
  const topK = config.ragTopK || 5;
  const embedding = await generateEmbedding(queryText);

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: 0.2, // Minimum similarity threshold
    match_count: topK
  });

  if (error) {
    console.error('Vector similarity RPC failed:', error);
    return [];
  }

  return data.map(chunk => chunk.content);
}

module.exports = {
  chunkText,
  embedAndStoreEbook,
  searchKnowledgeBase
};
