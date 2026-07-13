-- Migration: Add program_activities to reporttype enum
-- Date: 2026-07-13
-- Description: Adds 'program_activities' as a valid report type for program activity reports

-- ============================================================================
-- ADD ENUM VALUE
-- ============================================================================

-- Add program_activities to reporttype enum
-- Note: This must be run outside a transaction block in PostgreSQL
ALTER TYPE reporttype ADD VALUE IF NOT EXISTS 'program_activities';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the enum value was added
-- SELECT unnest(enum_range(NULL::reporttype));
-- Expected output: monthly, quarterly, annual, custom, program_activities
