const supabase = require('../config/db');
const pdfParse = require('pdf-parse');
const { embedAndStoreEbook } = require('../services/rag');

/**
 * Get Admin Knowledge Base statistics
 */
async function getStats(req, res) {
  try {
    const { data: ebooks, error: dbError } = await supabase
      .from('ebooks')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (dbError) throw dbError;

    // Get count of total chunks across all ebooks
    const { count: totalChunks, error: chunkCountError } = await supabase
      .from('ebook_chunks')
      .select('*', { count: 'exact', head: true });

    if (chunkCountError) throw chunkCountError;

    // Compile statistics
    const stats = {
      totalEbooks: ebooks.length,
      totalChunks: totalChunks || 0,
      totalEmbeddings: totalChunks || 0, // 1 embedding per chunk
      embeddingModel: 'text-embedding-004',
      ebookList: ebooks.map(eb => ({
        id: eb.id,
        filename: eb.filename,
        uploadedAt: eb.uploaded_at,
        status: eb.status,
        chunkCount: eb.chunk_count,
        lastProcessedAt: eb.last_processed_at
      }))
    };

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Upload an Ebook
 */
async function uploadEbook(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    const filename = req.file.originalname;

    // Insert initial ebook entry
    const { data: ebook, error: dbError } = await supabase
      .from('ebooks')
      .insert({ filename, status: 'processing' })
      .select()
      .single();

    if (dbError) {
      // Check if duplicate filename
      if (dbError.code === '23505') {
        return res.status(409).json({ success: false, message: 'An ebook with this filename already exists. Delete or replace it first.' });
      }
      throw dbError;
    }

    // Process PDF asynchronously
    const pdfData = await pdfParse(req.file.buffer);
    const textContent = pdfData.text;

    if (!textContent || textContent.trim().length === 0) {
      await supabase.from('ebooks').update({ status: 'failed' }).eq('id', ebook.id);
      return res.status(400).json({ success: false, message: 'Could not extract any text from this PDF file.' });
    }

    // Embed & Store chunks
    embedAndStoreEbook(ebook.id, textContent)
      .then(() => console.log(`Ebook ${filename} embedding generation completed.`))
      .catch(err => console.error(`Ebook ${filename} embedding generation failed:`, err));

    return res.status(202).json({
      success: true,
      message: 'Ebook uploaded and processing has started.',
      ebook: { id: ebook.id, filename: ebook.filename, status: 'processing' }
    });

  } catch (error) {
    console.error('Error uploading ebook:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Delete an Ebook
 */
async function deleteEbook(req, res) {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('ebooks').delete().eq('id', id);
    if (error) throw error;
    
    return res.status(200).json({ success: true, message: 'Ebook and associated vectors deleted successfully.' });
  } catch (error) {
    console.error('Error deleting ebook:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Rebuild Embeddings for an Ebook
 */
async function rebuildEmbeddings(req, res) {
  const { id } = req.params;
  try {
    const { data: ebook, error: selectError } = await supabase
      .from('ebooks')
      .select('*')
      .eq('id', id)
      .single();

    if (selectError || !ebook) {
      return res.status(404).json({ success: false, message: 'Ebook not found.' });
    }

    // Rebuild requires re-extracting PDF content. In production, we'd pull from file storage.
    // For simplicity, we search if the user has uploaded the file body or we re-embed existing text if saved.
    // Since we only parsed and didn't store raw full text of book in main DB (to save space, store chunks instead),
    // rebuild is best done by re-uploading the ebook or we can fetch chunks and re-embed.
    // Let's explain to the user that re-uploading handles rebuilding best, or we re-retrieve the PDF.
    // We will support a simple trigger if they supply the PDF file again in this rebuild endpoint.
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach the PDF file to rebuild its embeddings.' });
    }

    // Clear old chunks first
    await supabase.from('ebook_chunks').delete().eq('ebook_id', id);

    const pdfData = await pdfParse(req.file.buffer);
    const textContent = pdfData.text;

    embedAndStoreEbook(id, textContent)
      .then(() => console.log(`Ebook ${ebook.filename} rebuild completed.`))
      .catch(err => console.error(`Ebook ${ebook.filename} rebuild failed:`, err));

    return res.status(202).json({
      success: true,
      message: 'Rebuild started successfully.',
      ebook: { id: id, filename: ebook.filename, status: 'processing' }
    });

  } catch (error) {
    console.error('Error rebuilding embeddings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getStats,
  uploadEbook,
  deleteEbook,
  rebuildEmbeddings
};
