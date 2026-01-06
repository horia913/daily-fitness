-- ============================================================================
-- Migration: Remove block_parameters Columns
-- Purpose: Safely remove block_parameters JSONB columns from workout_blocks,
--          client_workout_blocks, and workout_block_assignments
-- 
-- IMPORTANT: 
-- 1. Run 11_verify_block_parameters_data_mapping.sql FIRST to verify
--    that all data is in relational tables
-- 2. Update code to remove block_parameters fallbacks BEFORE running this
-- 3. Backup database before execution
-- ============================================================================

-- Step 1: Create backup tables with block_parameters data
-- ============================================================================

-- Backup workout_blocks.block_parameters
CREATE TABLE IF NOT EXISTS workout_blocks_block_parameters_backup AS
SELECT 
  id,
  template_id,
  block_type,
  block_order,
  block_parameters,
  created_at,
  now() as backup_created_at
FROM workout_blocks
WHERE block_parameters IS NOT NULL
  AND block_parameters != '{}'::jsonb;

-- Add index for easy lookup
CREATE INDEX IF NOT EXISTS idx_workout_blocks_backup_id 
  ON workout_blocks_block_parameters_backup(id);

-- Backup client_workout_blocks.block_parameters
CREATE TABLE IF NOT EXISTS client_workout_blocks_block_parameters_backup AS
SELECT 
  id,
  client_id,
  workout_assignment_id,
  original_block_id,
  block_type,
  block_order,
  block_parameters,
  created_at,
  now() as backup_created_at
FROM client_workout_blocks
WHERE block_parameters IS NOT NULL
  AND block_parameters != '{}'::jsonb;

-- Add index for easy lookup
CREATE INDEX IF NOT EXISTS idx_client_workout_blocks_backup_id 
  ON client_workout_blocks_block_parameters_backup(id);

-- Backup workout_block_assignments.block_parameters (if any data exists)
CREATE TABLE IF NOT EXISTS workout_block_assignments_block_parameters_backup AS
SELECT 
  id,
  workout_assignment_id,
  workout_block_id,
  block_order,
  block_parameters,
  created_at,
  now() as backup_created_at
FROM workout_block_assignments
WHERE block_parameters IS NOT NULL
  AND block_parameters != '{}'::jsonb;

-- Add index for easy lookup
CREATE INDEX IF NOT EXISTS idx_workout_block_assignments_backup_id 
  ON workout_block_assignments_block_parameters_backup(id);

-- Step 2: Export backups to CSV using COPY command
-- ============================================================================
-- NOTE: These COPY commands require superuser or appropriate permissions
-- Run these from psql or adjust path/permissions as needed
-- The paths below are examples - adjust to your backup location

-- Uncomment and run these commands separately with appropriate permissions:

/*
-- Export workout_blocks backup
\copy (SELECT * FROM workout_blocks_block_parameters_backup) TO 'workout_blocks_block_parameters_backup.csv' WITH CSV HEADER;

-- Export client_workout_blocks backup
\copy (SELECT * FROM client_workout_blocks_block_parameters_backup) TO 'client_workout_blocks_block_parameters_backup.csv' WITH CSV HEADER;

-- Export workout_block_assignments backup (if table has data)
\copy (SELECT * FROM workout_block_assignments_block_parameters_backup) TO 'workout_block_assignments_block_parameters_backup.csv' WITH CSV HEADER;
*/

-- Alternative: Use COPY with absolute path (requires superuser)
-- COPY workout_blocks_block_parameters_backup TO '/absolute/path/to/backup/workout_blocks_block_parameters_backup.csv' WITH CSV HEADER;

-- Step 3: Add deprecation comments (before dropping)
-- ============================================================================

COMMENT ON COLUMN workout_blocks.block_parameters IS 
  'DEPRECATED: This column will be removed. All block data is stored in relational tables (workout_block_exercises, workout_drop_sets, workout_time_protocols, etc.). Backup created in workout_blocks_block_parameters_backup table.';

COMMENT ON COLUMN client_workout_blocks.block_parameters IS 
  'DEPRECATED: This column will be removed. All block data is stored in relational tables. Backup created in client_workout_blocks_block_parameters_backup table.';

COMMENT ON COLUMN workout_block_assignments.block_parameters IS 
  'DEPRECATED: This column will be removed. All block data is stored in relational tables. Backup created in workout_block_assignments_block_parameters_backup table.';

-- Step 4: Drop the columns
-- ============================================================================

-- Drop block_parameters from workout_blocks
ALTER TABLE workout_blocks 
DROP COLUMN IF EXISTS block_parameters;

-- Drop block_parameters from client_workout_blocks
ALTER TABLE client_workout_blocks 
DROP COLUMN IF EXISTS block_parameters;

-- Drop block_parameters from workout_block_assignments
ALTER TABLE workout_block_assignments 
DROP COLUMN IF EXISTS block_parameters;

-- Step 5: Verification queries
-- ============================================================================

-- Verify columns are dropped (should return 0 rows)
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('workout_blocks', 'client_workout_blocks', 'workout_block_assignments')
  AND column_name = 'block_parameters';

-- Verify backup tables exist and have data
SELECT 
  'workout_blocks_block_parameters_backup' as backup_table,
  COUNT(*) as backup_row_count,
  MIN(backup_created_at) as backup_created_at
FROM workout_blocks_block_parameters_backup
UNION ALL
SELECT 
  'client_workout_blocks_block_parameters_backup',
  COUNT(*),
  MIN(backup_created_at)
FROM client_workout_blocks_block_parameters_backup
UNION ALL
SELECT 
  'workout_block_assignments_block_parameters_backup',
  COUNT(*),
  MIN(backup_created_at)
FROM workout_block_assignments_block_parameters_backup;

-- Step 6: Add comments to backup tables
-- ============================================================================

COMMENT ON TABLE workout_blocks_block_parameters_backup IS 
  'Backup of workout_blocks.block_parameters before column removal. Created: ' || now()::text || '. Can be dropped after confirming no data loss and code updates complete.';

COMMENT ON TABLE client_workout_blocks_block_parameters_backup IS 
  'Backup of client_workout_blocks.block_parameters before column removal. Created: ' || now()::text || '. Can be dropped after confirming no data loss and code updates complete.';

COMMENT ON TABLE workout_block_assignments_block_parameters_backup IS 
  'Backup of workout_block_assignments.block_parameters before column removal. Created: ' || now()::text || '. Can be dropped after confirming no data loss and code updates complete.';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- If you need to rollback, run these commands:
--
-- -- Restore workout_blocks.block_parameters
-- ALTER TABLE workout_blocks 
-- ADD COLUMN block_parameters JSONB DEFAULT '{}'::jsonb;
--
-- UPDATE workout_blocks wb
-- SET block_parameters = backup.block_parameters
-- FROM workout_blocks_block_parameters_backup backup
-- WHERE wb.id = backup.id;
--
-- -- Restore client_workout_blocks.block_parameters
-- ALTER TABLE client_workout_blocks 
-- ADD COLUMN block_parameters JSONB DEFAULT '{}'::jsonb;
--
-- UPDATE client_workout_blocks cwb
-- SET block_parameters = backup.block_parameters
-- FROM client_workout_blocks_block_parameters_backup backup
-- WHERE cwb.id = backup.id;
--
-- -- Restore workout_block_assignments.block_parameters
-- ALTER TABLE workout_block_assignments 
-- ADD COLUMN block_parameters JSONB DEFAULT '{}'::jsonb;
--
-- UPDATE workout_block_assignments wba
-- SET block_parameters = backup.block_parameters
-- FROM workout_block_assignments_block_parameters_backup backup
-- WHERE wba.id = backup.id;
-- ============================================================================
