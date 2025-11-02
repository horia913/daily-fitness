-- ============================================
-- Mobility Metrics Schema Update
-- ============================================
-- This migration updates the mobility_metrics table to include:
-- 1. Correct anatomical fields (IR/ER for shoulder and hip)
-- 2. New assessment-specific fields
-- 3. Photos array column for storing assessment photos
-- 4. Removal of incorrect/outdated fields
-- ============================================

-- Step 1: Add new columns for correct anatomical measurements

-- Shoulder mobility fields (Internal/External Rotation)
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS left_shoulder_ir DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS left_shoulder_er DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_shoulder_ir DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_shoulder_er DECIMAL(5,1);

-- Shoulder abduction and flexion (keep if they don't exist, or they might already exist)
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS left_shoulder_abduction DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS left_shoulder_flexion DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_shoulder_abduction DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_shoulder_flexion DECIMAL(5,1);

-- Hip mobility fields (Internal/External Rotation)
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS left_hip_ir DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS left_hip_er DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_hip_ir DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_hip_er DECIMAL(5,1);

-- Hip straight leg raise and knee to chest
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS left_hip_straight_leg_raise DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS left_hip_knee_to_chest DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_hip_straight_leg_raise DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_hip_knee_to_chest DECIMAL(5,1);

-- Ankle mobility fields (Plantar Flexion)
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS left_ankle_plantar_flexion DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS right_ankle_plantar_flexion DECIMAL(5,1);

-- Spine mobility fields
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS forward_lean DECIMAL(5,1);

-- Overall assessment fields
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS toe_touch DECIMAL(5,1),
ADD COLUMN IF NOT EXISTS squat_depth DECIMAL(5,1);

-- Photos array column
ALTER TABLE mobility_metrics
ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Step 2: Migrate data from old columns to new columns (if they exist and have data)
-- Only migrate if the old columns exist and new columns are null

DO $$
BEGIN
    -- Migrate shoulder data if old columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mobility_metrics' 
        AND column_name = 'left_shoulder_extension'
    ) THEN
        -- Note: Extension was likely ER, but we can't be 100% sure
        -- Review your data before running this migration
        -- UPDATE mobility_metrics
        -- SET left_shoulder_er = left_shoulder_extension
        -- WHERE left_shoulder_er IS NULL AND left_shoulder_extension IS NOT NULL;
        NULL; -- Commented out for safety - review your data first
    END IF;
END $$;

-- Step 3: Drop old incorrect columns (after data migration review)
-- WARNING: Only uncomment these after reviewing and migrating your data!

-- Drop old shoulder columns (if they exist)
-- ALTER TABLE mobility_metrics
-- DROP COLUMN IF EXISTS left_shoulder_extension,
-- DROP COLUMN IF EXISTS right_shoulder_extension;

-- Drop old hip columns (if they exist and don't match new structure)
-- Note: left_hip_flexion/right_hip_flexion might need to be kept
-- if they represent different measurements than knee_to_chest
-- Review your data structure before dropping

-- ALTER TABLE mobility_metrics
-- DROP COLUMN IF EXISTS left_hip_extension,
-- DROP COLUMN IF EXISTS right_hip_extension;

-- Drop old ankle dorsiflexion if it should be plantar flexion
-- ALTER TABLE mobility_metrics
-- DROP COLUMN IF EXISTS left_ankle_dorsiflexion,
-- DROP COLUMN IF EXISTS right_ankle_dorsiflexion;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN mobility_metrics.left_shoulder_ir IS 'Left shoulder internal rotation in degrees';
COMMENT ON COLUMN mobility_metrics.left_shoulder_er IS 'Left shoulder external rotation in degrees';
COMMENT ON COLUMN mobility_metrics.right_shoulder_ir IS 'Right shoulder internal rotation in degrees';
COMMENT ON COLUMN mobility_metrics.right_shoulder_er IS 'Right shoulder external rotation in degrees';
COMMENT ON COLUMN mobility_metrics.left_hip_ir IS 'Left hip internal rotation in degrees';
COMMENT ON COLUMN mobility_metrics.left_hip_er IS 'Left hip external rotation in degrees';
COMMENT ON COLUMN mobility_metrics.right_hip_ir IS 'Right hip internal rotation in degrees';
COMMENT ON COLUMN mobility_metrics.right_hip_er IS 'Right hip external rotation in degrees';
COMMENT ON COLUMN mobility_metrics.left_hip_straight_leg_raise IS 'Left leg straight leg raise angle in degrees';
COMMENT ON COLUMN mobility_metrics.left_hip_knee_to_chest IS 'Left hip knee to chest angle in degrees';
COMMENT ON COLUMN mobility_metrics.right_hip_straight_leg_raise IS 'Right leg straight leg raise angle in degrees';
COMMENT ON COLUMN mobility_metrics.right_hip_knee_to_chest IS 'Right hip knee to chest angle in degrees';
COMMENT ON COLUMN mobility_metrics.left_ankle_plantar_flexion IS 'Left ankle plantar flexion in degrees';
COMMENT ON COLUMN mobility_metrics.right_ankle_plantar_flexion IS 'Right ankle plantar flexion in degrees';
COMMENT ON COLUMN mobility_metrics.forward_lean IS 'Forward lean angle in degrees';
COMMENT ON COLUMN mobility_metrics.toe_touch IS 'Toe touch distance in cm (0 = touching, positive = gap, negative = beyond)';
COMMENT ON COLUMN mobility_metrics.squat_depth IS 'Squat depth angle in degrees';
COMMENT ON COLUMN mobility_metrics.photos IS 'Array of photo URLs from Supabase Storage (progress-photos bucket)';

-- Step 5: Create indexes for common queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_mobility_metrics_client_assessed_date 
ON mobility_metrics(client_id, assessed_date DESC);

CREATE INDEX IF NOT EXISTS idx_mobility_metrics_assessment_type 
ON mobility_metrics(assessment_type);

-- Step 6: Verify the changes
-- Run these queries to verify:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'mobility_metrics' 
-- ORDER BY ordinal_position;

