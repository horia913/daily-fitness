-- Migration: Enhance Existing body_metrics Table
-- Date: 2025-12-29
-- Purpose: Add documentation + helper views for production use

-- ============================================================================
-- PART 1: Add comment to waist_circumference column
-- ============================================================================

COMMENT ON COLUMN body_metrics.waist_circumference IS 
'Measure right above iliac crest (hip bone) - critical for fat-loss tracking in recomp challenges. This is the PRIMARY metric for fat-loss track scoring.';

-- ============================================================================
-- PART 2: Create helper views for faster queries
-- ============================================================================

-- View 1: Latest measurement per client
-- Purpose: Quick lookup of each client's most recent measurements
-- Usage: SELECT * FROM latest_body_metrics WHERE client_id = '...';

CREATE OR REPLACE VIEW latest_body_metrics AS
SELECT DISTINCT ON (client_id)
  id,
  client_id,
  coach_id,
  measured_date,
  weight_kg,
  waist_circumference,
  body_fat_percentage,
  muscle_mass_kg,
  visceral_fat_level,
  left_arm_circumference,
  right_arm_circumference,
  torso_circumference,
  hips_circumference,
  left_thigh_circumference,
  right_thigh_circumference,
  left_calf_circumference,
  right_calf_circumference,
  measurement_method,
  notes,
  created_at,
  updated_at
FROM body_metrics
ORDER BY client_id, measured_date DESC, created_at DESC;

COMMENT ON VIEW latest_body_metrics IS 
'Most recent body measurement for each client - optimized for coach dashboards and progress tracking';

-- View 2: Monthly measurement summary
-- Purpose: Pre-aggregated monthly stats for analytics and reporting
-- Usage: SELECT * FROM monthly_body_metrics_summary WHERE client_id = '...' AND month >= '2025-01-01';

CREATE OR REPLACE VIEW monthly_body_metrics_summary AS
WITH monthly_data AS (
  SELECT 
    client_id,
    DATE_TRUNC('month', measured_date) as month,
    measured_date,
    weight_kg,
    waist_circumference,
    body_fat_percentage,
    muscle_mass_kg,
    visceral_fat_level,
    -- Get first and last measurements per client per month
    FIRST_VALUE(weight_kg) OVER (
      PARTITION BY client_id, DATE_TRUNC('month', measured_date) 
      ORDER BY measured_date ASC
    ) as first_weight_kg,
    LAST_VALUE(weight_kg) OVER (
      PARTITION BY client_id, DATE_TRUNC('month', measured_date) 
      ORDER BY measured_date ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as last_weight_kg,
    FIRST_VALUE(waist_circumference) OVER (
      PARTITION BY client_id, DATE_TRUNC('month', measured_date) 
      ORDER BY measured_date ASC
    ) as first_waist_cm,
    LAST_VALUE(waist_circumference) OVER (
      PARTITION BY client_id, DATE_TRUNC('month', measured_date) 
      ORDER BY measured_date ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as last_waist_cm,
    MIN(measured_date) OVER (
      PARTITION BY client_id, DATE_TRUNC('month', measured_date)
    ) as first_measurement,
    MAX(measured_date) OVER (
      PARTITION BY client_id, DATE_TRUNC('month', measured_date)
    ) as last_measurement
  FROM body_metrics
)
SELECT DISTINCT
  client_id,
  month,
  COUNT(*) OVER (PARTITION BY client_id, month) as measurement_count,
  AVG(weight_kg) OVER (PARTITION BY client_id, month) as avg_weight_kg,
  AVG(waist_circumference) OVER (PARTITION BY client_id, month) as avg_waist_cm,
  AVG(body_fat_percentage) OVER (PARTITION BY client_id, month) as avg_body_fat_pct,
  AVG(muscle_mass_kg) OVER (PARTITION BY client_id, month) as avg_muscle_mass_kg,
  AVG(visceral_fat_level) OVER (PARTITION BY client_id, month) as avg_visceral_fat,
  first_measurement,
  last_measurement,
  -- Calculate changes within the month (last - first)
  (last_weight_kg - first_weight_kg) as weight_change_kg,
  (last_waist_cm - first_waist_cm) as waist_change_cm
FROM monthly_data
ORDER BY month DESC, client_id;

COMMENT ON VIEW monthly_body_metrics_summary IS 
'Aggregated monthly body metrics per client with within-month progress deltas - optimized for coach reporting and analytics dashboards';

-- ============================================================================
-- PART 3: Verification queries (run after migration)
-- ============================================================================

-- Query 1: Check waist comment was added
-- SELECT col_description('body_metrics'::regclass, 
--   (SELECT ordinal_position FROM information_schema.columns 
--    WHERE table_name = 'body_metrics' AND column_name = 'waist_circumference')
-- );
-- Expected: Returns comment about iliac crest

-- Query 2: Check views were created
-- SELECT table_name FROM information_schema.views 
-- WHERE table_name IN ('latest_body_metrics', 'monthly_body_metrics_summary');
-- Expected: Both views listed

-- Query 3: Test latest view (use a real client_id)
-- SELECT client_id, measured_date, weight_kg, waist_circumference 
-- FROM latest_body_metrics 
-- LIMIT 5;
-- Expected: One row per client with most recent data

-- Query 4: Test summary view
-- SELECT client_id, month, measurement_count, weight_change_kg 
-- FROM monthly_body_metrics_summary 
-- WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
-- ORDER BY month DESC, client_id 
-- LIMIT 10;
-- Expected: Monthly aggregates with progress deltas

-- ============================================================================
-- NOTES
-- ============================================================================

-- The existing body_metrics table already has all required structure:
-- ✓ Indexes: client_date, unique constraint per day
-- ✓ RLS Policies: clients can view own, coaches can view their clients
-- ✓ All required fields for recomp challenges
-- ✓ Superior schema: visceral_fat, torso, coach_id (UUID)

-- This migration adds:
-- ✓ Documentation (waist measurement comment)
-- ✓ Performance (views for common queries)
-- ✓ Analytics (pre-aggregated monthly summaries)

