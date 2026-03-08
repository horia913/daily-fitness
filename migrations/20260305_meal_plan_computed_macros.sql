-- Migration: 20260305_meal_plan_computed_macros.sql
-- Add cached/computed macro columns to meal_plans so the card list can
-- display actual nutritional totals without re-querying food items every time.
-- These are populated by saveGeneratedPlan and can be refreshed by the editor.

ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS computed_calories NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS computed_protein NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS computed_carbs  NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS computed_fat    NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS computed_fiber  NUMERIC;

-- generated_config was added in the Phase N2 migration; guard here in case
-- someone runs migrations out of order.
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS generated_config JSONB;
