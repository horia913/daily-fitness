-- Migration: Add Missing Uniqueness Constraint for Meal Photos
-- Date: 2025-12-29
-- Purpose: Enforce "1 photo per meal per day" rule at the database level
-- This should have been in the original Slice 12 migration but was missing

-- ============================================================================
-- Add UNIQUE constraint to prevent duplicate photos for same meal/day
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE t.relname = 'meal_photo_logs'
        AND n.nspname = 'public'
        AND c.conname = 'unique_meal_photo_per_day'
    ) THEN
        ALTER TABLE meal_photo_logs
        ADD CONSTRAINT unique_meal_photo_per_day 
        UNIQUE (client_id, meal_id, log_date);
    END IF;
END
$$;

COMMENT ON CONSTRAINT unique_meal_photo_per_day ON meal_photo_logs IS
'Ensures a client can only upload ONE photo per meal per day. Core accountability rule.';

-- ============================================================================
-- Verification Query (should return 1 row after running)
-- ============================================================================
-- SELECT 
--   c.conname AS constraint_name,
--   pg_get_constraintdef(c.oid) AS constraint_definition
-- FROM pg_constraint c
-- JOIN pg_class t ON c.conrelid = t.oid
-- JOIN pg_namespace n ON t.relnamespace = n.oid
-- WHERE t.relname = 'meal_photo_logs'
--   AND n.nspname = 'public'
--   AND c.conname = 'unique_meal_photo_per_day';



