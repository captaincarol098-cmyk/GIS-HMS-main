-- Migration: Add program types and funding source to nutrition_programs
-- Date: 2026-07-13

-- Add new columns to nutrition_programs table
ALTER TABLE nutrition_programs 
ADD COLUMN IF NOT EXISTS program_type VARCHAR(50) DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(50) DEFAULT 'City Funded Program',
ADD COLUMN IF NOT EXISTS ai_recommended_budget FLOAT,
ADD COLUMN IF NOT EXISTS ai_recommendation_notes TEXT;

-- Update existing records to have proper defaults
UPDATE nutrition_programs 
SET program_type = 'Other' 
WHERE program_type IS NULL;

UPDATE nutrition_programs 
SET funding_source = 'City Funded Program' 
WHERE funding_source IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nutrition_programs_program_type ON nutrition_programs(program_type);
CREATE INDEX IF NOT EXISTS idx_nutrition_programs_funding_source ON nutrition_programs(funding_source);
