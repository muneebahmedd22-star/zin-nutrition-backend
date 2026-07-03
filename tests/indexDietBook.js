const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = require('../src/config/db');
const { embedAndStoreEbook } = require('../src/services/rag');

const LOCAL_DIET_BOOK_PATH = "C:\\Users\\Dell\\Downloads\\Eat Right 4 Your Type PDF.pdf";

async function runDietIndexing() {
  console.log('--- ZIN NUTRITION DIET KNOWLEDGE BASE INDEXER ---');
  
  if (!fs.existsSync(LOCAL_DIET_BOOK_PATH)) {
    console.error(`Error: Could not find PDF textbook at ${LOCAL_DIET_BOOK_PATH}`);
    process.exit(1);
  }

  console.log(`Loading PDF: ${LOCAL_DIET_BOOK_PATH}...`);
  const pdfBuffer = fs.readFileSync(LOCAL_DIET_BOOK_PATH);

  console.log('Extracting text content from PDF...');
  const pdfData = await pdfParse(pdfBuffer);
  const textContent = pdfData.text;

  console.log(`Text extraction completed. Character length: ${textContent.length}`);
  
  const filename = path.basename(LOCAL_DIET_BOOK_PATH);
  
  console.log(`Registering ebook "${filename}" in Supabase...`);
  const { data: existing, error: selectError } = await supabase
    .from('ebooks')
    .select('id')
    .eq('filename', filename)
    .maybeSingle();

  if (selectError) {
    console.error('Error querying Supabase:', selectError.message);
    process.exit(1);
  }

  let ebookId;
  if (existing) {
    console.log(`Ebook "${filename}" is already registered. Clearing old embeddings to rebuild...`);
    ebookId = existing.id;
    await supabase.from('ebook_chunks').delete().eq('ebook_id', ebookId);
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('ebooks')
      .insert({ filename, status: 'processing' })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert ebook record:', insertError.message);
      process.exit(1);
    }
    ebookId = inserted.id;
  }

  console.log(`Starting chunking and embedding pipeline (Gemini text-embedding-004 + Supabase pgvector)...`);
  
  try {
    await embedAndStoreEbook(ebookId, textContent);
    console.log('\nSUCCESS: Diet book parsed, chunked, embedded, and saved to Supabase successfully!');
    
    const { data: updated } = await supabase.from('ebooks').select('*').eq('id', ebookId).single();
    console.log(`Ebook Status: ${updated.status}`);
    console.log(`Total Chunks Generated: ${updated.chunk_count}`);
  } catch (error) {
    console.error('\nEmbedding Pipeline Failed:', error);
  }
}

runDietIndexing().catch(err => {
  console.error('Unexpected script failure:', err);
});
