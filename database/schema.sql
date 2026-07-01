-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Ebooks Metadata Table
CREATE TABLE IF NOT EXISTS ebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL UNIQUE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    chunk_count INT DEFAULT 0,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    embedding_model TEXT DEFAULT 'text-embedding-004'
);

-- 2. Ebook Chunks & Embeddings Table
-- Note: Gemini's gemini-embedding-001 model is configured to generate 768-dimensional vectors.
CREATE TABLE IF NOT EXISTS ebook_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ebook_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for Vector Cosine Similarity Search
CREATE INDEX IF NOT EXISTS ebook_chunks_embedding_hnsw_idx ON ebook_chunks USING hnsw (embedding vector_cosine_ops);

-- 3. Assessments Table (Stores Form Inputs)
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INT NOT NULL,
    height TEXT NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    goal TEXT NOT NULL,
    food_preference TEXT NOT NULL,
    carbs_preference TEXT NOT NULL,
    meat_preference TEXT NOT NULL,
    allergies TEXT,
    workout_frequency TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Generated Training Programs Table
CREATE TABLE IF NOT EXISTS generated_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    order_id TEXT UNIQUE NOT NULL,
    pdf_url TEXT, -- Link to generated PDF
    program_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Helper Function for Similarity Search
CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  ebook_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    ebook_chunks.id,
    ebook_chunks.ebook_id,
    ebook_chunks.content,
    1 - (ebook_chunks.embedding <=> query_embedding) AS similarity
  FROM ebook_chunks
  WHERE 1 - (ebook_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY ebook_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
