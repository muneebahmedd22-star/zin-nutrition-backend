const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = require('../src/config/db');
const { embedAndStoreEbook } = require('../src/services/rag');

const LOCAL_EBOOK_PATH = "C:\\Users\\Dell\\Downloads\\NASM_CPT_Full_Textbook.pdf";

async function runLocalIndexingTest() {
  console.log('--- ZIN NUTRITION AI KNOWLEDGE BASE LOCAL INDEXER ---');
  
  if (!fs.existsSync(LOCAL_EBOOK_PATH)) {
    console.error(`Error: Could not find PDF textbook at ${LOCAL_EBOOK_PATH}`);
    console.log('Please make sure the ebook exists at the specified path.');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.GEMINI_API_KEY) {
    console.error('Error: SUPABASE_URL, SUPABASE_KEY, or GEMINI_API_KEY is not defined in .env file.');
    console.log('Please create a .env file in the backend directory with your credentials first.');
    process.exit(1);
  }

  console.log(`Loading PDF: ${LOCAL_EBOOK_PATH}...`);
  const pdfBuffer = fs.readFileSync(LOCAL_EBOOK_PATH);

  console.log('Extracting text content from PDF...');
  const pdfData = await pdfParse(pdfBuffer);
  const textContent = pdfData.text;

  console.log(`Text extraction completed. Character length: ${textContent.length}`);
  
  const filename = path.basename(LOCAL_EBOOK_PATH);
  
  console.log(`Registering ebook "${filename}" in Supabase...`);
  // Insert or fetch existing ebook ID
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
  console.log('This may take several minutes depending on the size of the textbook. Please wait...');
  
  try {
    await embedAndStoreEbook(ebookId, textContent);
    console.log('\nSUCCESS: Ebook parsed, chunked, embedded, and saved to Supabase successfully!');
    
    // Retrieve status from Supabase
    const { data: updated } = await supabase.from('ebooks').select('*').eq('id', ebookId).single();
    console.log(`Ebook Status: ${updated.status}`);
    console.log(`Total Chunks Generated: ${updated.chunk_count}`);
  } catch (error) {
    console.error('\nEmbedding Pipeline Failed:', error);
  }
}

runLocalIndexingTest().catch(err => {
  console.error('Unexpected script failure:', err);
});
