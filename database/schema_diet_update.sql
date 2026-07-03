-- Add health filters to diet assessments
ALTER TABLE diet_assessments ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE diet_assessments ADD COLUMN IF NOT EXISTS carbs_preference TEXT;
