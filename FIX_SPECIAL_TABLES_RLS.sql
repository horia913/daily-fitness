-- Fix RLS policies for special workout tables
-- This allows coaches to manage special table data (cluster_sets, time_protocols, etc.) for blocks they own
--
-- These tables link to workout_blocks via block_id, and workout_blocks link to workout_templates via template_id
-- Policies check that the block belongs to a template owned by the coach

-- ============================================================
-- 1. workout_cluster_sets
-- ============================================================

-- Enable RLS on workout_cluster_sets if not already enabled
ALTER TABLE workout_cluster_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert cluster sets into their blocks" ON workout_cluster_sets;
DROP POLICY IF EXISTS "Coaches can view cluster sets in their blocks" ON workout_cluster_sets;
DROP POLICY IF EXISTS "Coaches can update cluster sets in their blocks" ON workout_cluster_sets;
DROP POLICY IF EXISTS "Coaches can delete cluster sets from their blocks" ON workout_cluster_sets;

-- Policy: Coaches can INSERT cluster sets into blocks they own
CREATE POLICY "Coaches can insert cluster sets into their blocks"
ON workout_cluster_sets
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_cluster_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT cluster sets from blocks they own
CREATE POLICY "Coaches can view cluster sets in their blocks"
ON workout_cluster_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_cluster_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE cluster sets in blocks they own
CREATE POLICY "Coaches can update cluster sets in their blocks"
ON workout_cluster_sets
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_cluster_sets.block_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_cluster_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE cluster sets from blocks they own
CREATE POLICY "Coaches can delete cluster sets from their blocks"
ON workout_cluster_sets
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_cluster_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- ============================================================
-- 2. workout_time_protocols
-- ============================================================

-- Enable RLS on workout_time_protocols if not already enabled
ALTER TABLE workout_time_protocols ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert time protocols into their blocks" ON workout_time_protocols;
DROP POLICY IF EXISTS "Coaches can view time protocols in their blocks" ON workout_time_protocols;
DROP POLICY IF EXISTS "Coaches can update time protocols in their blocks" ON workout_time_protocols;
DROP POLICY IF EXISTS "Coaches can delete time protocols from their blocks" ON workout_time_protocols;

-- Policy: Coaches can INSERT time protocols into blocks they own
CREATE POLICY "Coaches can insert time protocols into their blocks"
ON workout_time_protocols
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_time_protocols.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT time protocols from blocks they own
CREATE POLICY "Coaches can view time protocols in their blocks"
ON workout_time_protocols
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_time_protocols.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE time protocols in blocks they own
CREATE POLICY "Coaches can update time protocols in their blocks"
ON workout_time_protocols
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_time_protocols.block_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_time_protocols.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE time protocols from blocks they own
CREATE POLICY "Coaches can delete time protocols from their blocks"
ON workout_time_protocols
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_time_protocols.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- ============================================================
-- 3. workout_drop_sets
-- ============================================================

-- Enable RLS on workout_drop_sets if not already enabled
ALTER TABLE workout_drop_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert drop sets into their blocks" ON workout_drop_sets;
DROP POLICY IF EXISTS "Coaches can view drop sets in their blocks" ON workout_drop_sets;
DROP POLICY IF EXISTS "Coaches can update drop sets in their blocks" ON workout_drop_sets;
DROP POLICY IF EXISTS "Coaches can delete drop sets from their blocks" ON workout_drop_sets;

-- Policy: Coaches can INSERT drop sets into blocks they own
CREATE POLICY "Coaches can insert drop sets into their blocks"
ON workout_drop_sets
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_drop_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT drop sets from blocks they own
CREATE POLICY "Coaches can view drop sets in their blocks"
ON workout_drop_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_drop_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE drop sets in blocks they own
CREATE POLICY "Coaches can update drop sets in their blocks"
ON workout_drop_sets
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_drop_sets.block_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_drop_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE drop sets from blocks they own
CREATE POLICY "Coaches can delete drop sets from their blocks"
ON workout_drop_sets
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_drop_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- ============================================================
-- 4. workout_rest_pause_sets
-- ============================================================

-- Enable RLS on workout_rest_pause_sets if not already enabled
ALTER TABLE workout_rest_pause_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert rest pause sets into their blocks" ON workout_rest_pause_sets;
DROP POLICY IF EXISTS "Coaches can view rest pause sets in their blocks" ON workout_rest_pause_sets;
DROP POLICY IF EXISTS "Coaches can update rest pause sets in their blocks" ON workout_rest_pause_sets;
DROP POLICY IF EXISTS "Coaches can delete rest pause sets from their blocks" ON workout_rest_pause_sets;

-- Policy: Coaches can INSERT rest pause sets into blocks they own
CREATE POLICY "Coaches can insert rest pause sets into their blocks"
ON workout_rest_pause_sets
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_rest_pause_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT rest pause sets from blocks they own
CREATE POLICY "Coaches can view rest pause sets in their blocks"
ON workout_rest_pause_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_rest_pause_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE rest pause sets in blocks they own
CREATE POLICY "Coaches can update rest pause sets in their blocks"
ON workout_rest_pause_sets
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_rest_pause_sets.block_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_rest_pause_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE rest pause sets from blocks they own
CREATE POLICY "Coaches can delete rest pause sets from their blocks"
ON workout_rest_pause_sets
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_rest_pause_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- ============================================================
-- 5. workout_pyramid_sets
-- ============================================================

-- Enable RLS on workout_pyramid_sets if not already enabled
ALTER TABLE workout_pyramid_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert pyramid sets into their blocks" ON workout_pyramid_sets;
DROP POLICY IF EXISTS "Coaches can view pyramid sets in their blocks" ON workout_pyramid_sets;
DROP POLICY IF EXISTS "Coaches can update pyramid sets in their blocks" ON workout_pyramid_sets;
DROP POLICY IF EXISTS "Coaches can delete pyramid sets from their blocks" ON workout_pyramid_sets;

-- Policy: Coaches can INSERT pyramid sets into blocks they own
CREATE POLICY "Coaches can insert pyramid sets into their blocks"
ON workout_pyramid_sets
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_pyramid_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT pyramid sets from blocks they own
CREATE POLICY "Coaches can view pyramid sets in their blocks"
ON workout_pyramid_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_pyramid_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE pyramid sets in blocks they own
CREATE POLICY "Coaches can update pyramid sets in their blocks"
ON workout_pyramid_sets
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_pyramid_sets.block_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_pyramid_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE pyramid sets from blocks they own
CREATE POLICY "Coaches can delete pyramid sets from their blocks"
ON workout_pyramid_sets
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_pyramid_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- ============================================================
-- 6. workout_ladder_sets
-- ============================================================

-- Enable RLS on workout_ladder_sets if not already enabled
ALTER TABLE workout_ladder_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert ladder sets into their blocks" ON workout_ladder_sets;
DROP POLICY IF EXISTS "Coaches can view ladder sets in their blocks" ON workout_ladder_sets;
DROP POLICY IF EXISTS "Coaches can update ladder sets in their blocks" ON workout_ladder_sets;
DROP POLICY IF EXISTS "Coaches can delete ladder sets from their blocks" ON workout_ladder_sets;

-- Policy: Coaches can INSERT ladder sets into blocks they own
CREATE POLICY "Coaches can insert ladder sets into their blocks"
ON workout_ladder_sets
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_ladder_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT ladder sets from blocks they own
CREATE POLICY "Coaches can view ladder sets in their blocks"
ON workout_ladder_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_ladder_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE ladder sets in blocks they own
CREATE POLICY "Coaches can update ladder sets in their blocks"
ON workout_ladder_sets
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_ladder_sets.block_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_ladder_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE ladder sets from blocks they own
CREATE POLICY "Coaches can delete ladder sets from their blocks"
ON workout_ladder_sets
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_ladder_sets.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- ============================================================
-- SUMMARY
-- ============================================================
-- This script adds RLS policies for all special workout tables:
-- 1. workout_cluster_sets
-- 2. workout_time_protocols
-- 3. workout_drop_sets
-- 4. workout_rest_pause_sets
-- 5. workout_pyramid_sets
-- 6. workout_ladder_sets
--
-- All policies follow the same pattern:
-- - Coaches can manage data in blocks that belong to templates they own
-- - Checks: block_id -> workout_blocks -> workout_templates -> coach_id = auth.uid()
-- ============================================================

