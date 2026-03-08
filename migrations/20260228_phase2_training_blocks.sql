-- ============================================================
-- Phase 2: Training Blocks — Data Layer
-- ============================================================
-- Scope  : Adds training_blocks table; seeds one implicit block per
--          existing workout_program; links program_schedule and
--          program_progression_rules rows to their implicit block.
-- Safety : All new columns are nullable FKs — zero impact on existing
--          INSERT/UPDATE paths that do not supply training_block_id.
-- Apply  : Paste into Supabase SQL Editor and run once.
--          Idempotent guard on table creation prevents re-run errors.
-- ============================================================

-- Pre-migration verification (run these SELECTs before applying to
-- confirm baseline counts; compare to post-migration verification below)
--
-- SELECT 'workout_programs'        , COUNT(*) FROM workout_programs;
-- SELECT 'program_schedule'        , COUNT(*) FROM program_schedule;
-- SELECT 'program_progression_rules', COUNT(*) FROM program_progression_rules;
-- Expected: 9 / 76 / 292 rows (as of 2026-02-28)

BEGIN;

-- ============================================================
-- PART 1: Create training_blocks table
-- ============================================================

CREATE TABLE IF NOT EXISTS training_blocks (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id         UUID        NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  goal               TEXT        NOT NULL DEFAULT 'custom',
  custom_goal_label  TEXT,
  duration_weeks     INTEGER     NOT NULL DEFAULT 4,
  block_order        INTEGER     NOT NULL DEFAULT 1,
  progression_profile TEXT       DEFAULT 'none',
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by program in display order
CREATE INDEX IF NOT EXISTS idx_training_blocks_program
  ON training_blocks(program_id, block_order);

-- ============================================================
-- PART 2: Add training_block_id to program_schedule
-- ============================================================

ALTER TABLE program_schedule
  ADD COLUMN IF NOT EXISTS training_block_id UUID
  REFERENCES training_blocks(id) ON DELETE CASCADE;

-- ============================================================
-- PART 3: Add training_block_id to program_progression_rules
-- ============================================================

ALTER TABLE program_progression_rules
  ADD COLUMN IF NOT EXISTS training_block_id UUID
  REFERENCES training_blocks(id) ON DELETE CASCADE;

-- ============================================================
-- PART 4: Seed one implicit training block per workout_program
-- The block name is "<program name> - Phase 1".
-- duration_weeks is taken from the program (defaults to 4 if NULL).
-- ============================================================

INSERT INTO training_blocks (
  program_id,
  name,
  goal,
  duration_weeks,
  block_order,
  progression_profile
)
SELECT
  p.id,
  COALESCE(p.name, 'Training Block') || ' - Phase 1',
  'custom',
  COALESCE(p.duration_weeks, 4),
  1,
  'none'
FROM workout_programs p
WHERE NOT EXISTS (
  SELECT 1 FROM training_blocks tb WHERE tb.program_id = p.id
);

-- ============================================================
-- PART 5: Link existing program_schedule rows to their
--         program's implicit training block (block_order = 1)
-- ============================================================

UPDATE program_schedule ps
SET    training_block_id = tb.id
FROM   training_blocks tb
WHERE  ps.program_id         = tb.program_id
  AND  tb.block_order        = 1
  AND  ps.training_block_id  IS NULL;

-- ============================================================
-- PART 6: Link existing program_progression_rules rows to their
--         program's implicit training block (block_order = 1)
-- ============================================================

UPDATE program_progression_rules ppr
SET    training_block_id = tb.id
FROM   training_blocks tb
WHERE  ppr.program_id        = tb.program_id
  AND  tb.block_order        = 1
  AND  ppr.training_block_id IS NULL;

-- ============================================================
-- PART 7: Row-Level Security for training_blocks
-- ============================================================

ALTER TABLE training_blocks ENABLE ROW LEVEL SECURITY;

-- Coaches can view training blocks for their own programs
CREATE POLICY "Coaches can view their training blocks"
ON training_blocks FOR SELECT
USING (
  program_id IN (
    SELECT id FROM workout_programs WHERE coach_id = auth.uid()
  )
);

-- Coaches can insert training blocks for their own programs
CREATE POLICY "Coaches can insert training blocks"
ON training_blocks FOR INSERT
WITH CHECK (
  program_id IN (
    SELECT id FROM workout_programs WHERE coach_id = auth.uid()
  )
);

-- Coaches can update training blocks for their own programs
CREATE POLICY "Coaches can update their training blocks"
ON training_blocks FOR UPDATE
USING (
  program_id IN (
    SELECT id FROM workout_programs WHERE coach_id = auth.uid()
  )
);

-- Coaches can delete training blocks for their own programs
CREATE POLICY "Coaches can delete their training blocks"
ON training_blocks FOR DELETE
USING (
  program_id IN (
    SELECT id FROM workout_programs WHERE coach_id = auth.uid()
  )
);

-- Clients can view training blocks for programs assigned to them
CREATE POLICY "Clients can view assigned training blocks"
ON training_blocks FOR SELECT
USING (
  program_id IN (
    SELECT program_id
    FROM   program_assignments
    WHERE  client_id = auth.uid()
  )
);

COMMIT;

-- ============================================================
-- Post-migration verification (run after applying)
-- ============================================================
--
-- -- 1. training_blocks created = one per program
-- SELECT COUNT(*) AS training_blocks_count FROM training_blocks;
-- -- Expected: 9 (one per workout_program)
--
-- SELECT COUNT(*) AS programs_count FROM workout_programs;
-- -- Expected: 9
--
-- -- 2. No unlinked schedule rows
-- SELECT COUNT(*) AS unlinked_schedule
-- FROM program_schedule WHERE training_block_id IS NULL;
-- -- Expected: 0
--
-- -- 3. No unlinked progression rule rows
-- SELECT COUNT(*) AS unlinked_rules
-- FROM program_progression_rules WHERE training_block_id IS NULL;
-- -- Expected: 0
--
-- -- 4. Spot-check: each program has exactly one training block
-- SELECT p.id, p.name, COUNT(tb.id) AS block_count
-- FROM workout_programs p
-- LEFT JOIN training_blocks tb ON tb.program_id = p.id
-- GROUP BY p.id, p.name
-- ORDER BY block_count;
-- -- Every row should show block_count = 1
--
-- -- 5. Spot-check: sample block data
-- SELECT p.id AS program_id, p.name AS program_name,
--        tb.id AS block_id, tb.name AS block_name,
--        tb.goal, tb.duration_weeks
-- FROM workout_programs p
-- LEFT JOIN training_blocks tb ON tb.program_id = p.id
-- LIMIT 5;
