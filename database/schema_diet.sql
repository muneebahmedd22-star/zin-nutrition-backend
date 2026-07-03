-- 1. Diet Assessments Table (Includes Blood Type)
CREATE TABLE IF NOT EXISTS diet_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    age INT NOT NULL,
    height TEXT NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    goal TEXT NOT NULL,
    blood_type TEXT NOT NULL, -- 'O', 'A', 'B', 'AB'
    food_preference TEXT NOT NULL, -- 'Veg', 'Non-Veg'
    allergies TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Generated Diet Plans Table
CREATE TABLE IF NOT EXISTS generated_diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    order_id TEXT UNIQUE NOT NULL,
    pdf_url TEXT, -- Link to generated PDF in Supabase Storage
    plan_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE diet_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_diet_plans ENABLE ROW LEVEL SECURITY;

-- Setup Access Policies
CREATE POLICY "service_role_all_diet_assessments" ON diet_assessments FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_diet_plans" ON generated_diet_plans FOR ALL TO service_role USING (true);
