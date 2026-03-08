-- ============================================================================
-- Phase 1: Rename "block" → "set entry" terminology
-- Date: 2026-02-28
--
-- SCOPE:
--   Tables renamed:
--     workout_blocks            → workout_set_entries
--     workout_block_exercises   → workout_set_entry_exercises
--     workout_block_completions → workout_set_entry_completions  (if exists)
--
--   Columns renamed (within renamed tables and others):
--     workout_set_entries:           block_type→set_type, block_order→set_order,
--                                    block_name→set_name, block_notes→set_notes
--     workout_set_entry_exercises:   block_id→set_entry_id
--     workout_set_entry_completions: workout_block_id→workout_set_entry_id
--     workout_drop_sets:             block_id→set_entry_id
--     workout_cluster_sets:          block_id→set_entry_id
--     workout_rest_pause_sets:       block_id→set_entry_id
--     workout_pyramid_sets:          block_id→set_entry_id
--     workout_ladder_sets:           block_id→set_entry_id
--     workout_time_protocols:        block_id→set_entry_id
--     workout_hr_sets:               block_id→set_entry_id
--     workout_set_logs:              block_id→set_entry_id, block_type→set_type
--     program_progression_rules:     block_id→set_entry_id, block_type→set_type,
--                                    block_order→set_order, block_name→set_name
--
--   Enum renamed:
--     workout_block_type → workout_set_type
--
-- SAFETY:
--   All RLS policies that reference workout_blocks (or workout_block_exercises)
--   in their USING/WITH CHECK bodies are dropped first, then recreated with
--   updated table/column names after the renames complete.
--
-- HOW TO APPLY:
--   Paste into Supabase SQL Editor and run. Works as a single transaction.
-- ============================================================================

BEGIN;

-- ===========================================================================
-- PART 1: DROP ALL AFFECTED RLS POLICIES
-- (any policy whose USING/WITH CHECK body references workout_blocks
--  or workout_block_exercises as a JOIN target must be recreated)
-- ===========================================================================

-- ── workout_blocks policies (7) ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can read assigned workout blocks"      ON public.workout_blocks;
DROP POLICY IF EXISTS "Clients can view blocks in assigned workouts"  ON public.workout_blocks;
DROP POLICY IF EXISTS "Coaches can delete blocks from their templates" ON public.workout_blocks;
DROP POLICY IF EXISTS "Coaches can insert blocks into their templates" ON public.workout_blocks;
DROP POLICY IF EXISTS "Coaches can manage workout blocks"              ON public.workout_blocks;
DROP POLICY IF EXISTS "Coaches can update blocks in their templates"   ON public.workout_blocks;
DROP POLICY IF EXISTS "Coaches can view blocks in their templates"     ON public.workout_blocks;

-- ── workout_block_exercises policies (6) ────────────────────────────────────
DROP POLICY IF EXISTS "Clients can read assigned workout block exercises"   ON public.workout_block_exercises;
DROP POLICY IF EXISTS "Clients can view exercises in assigned workouts"     ON public.workout_block_exercises;
DROP POLICY IF EXISTS "Coaches can delete exercises from their blocks"      ON public.workout_block_exercises;
DROP POLICY IF EXISTS "Coaches can insert exercises into their blocks"      ON public.workout_block_exercises;
DROP POLICY IF EXISTS "Coaches can update exercises in their blocks"        ON public.workout_block_exercises;
DROP POLICY IF EXISTS "Coaches can view exercises in their blocks"          ON public.workout_block_exercises;

-- ── workout_block_completions policies (4) ──────────────────────────────────
DROP POLICY IF EXISTS "Clients select own block completions"  ON public.workout_block_completions;
DROP POLICY IF EXISTS "Clients insert own block completions"  ON public.workout_block_completions;
DROP POLICY IF EXISTS "Clients update own block completions"  ON public.workout_block_completions;
DROP POLICY IF EXISTS "Clients delete own block completions"  ON public.workout_block_completions;

-- ── workout_cluster_sets policies (5) ───────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view cluster sets in assigned workouts"    ON public.workout_cluster_sets;
DROP POLICY IF EXISTS "Coaches can delete cluster sets from their blocks"     ON public.workout_cluster_sets;
DROP POLICY IF EXISTS "Coaches can insert cluster sets into their blocks"     ON public.workout_cluster_sets;
DROP POLICY IF EXISTS "Coaches can update cluster sets in their blocks"       ON public.workout_cluster_sets;
DROP POLICY IF EXISTS "Coaches can view cluster sets in their blocks"         ON public.workout_cluster_sets;

-- ── workout_time_protocols policies (5) ─────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view time protocols in assigned workouts"  ON public.workout_time_protocols;
DROP POLICY IF EXISTS "Coaches can delete time protocols from their blocks"   ON public.workout_time_protocols;
DROP POLICY IF EXISTS "Coaches can insert time protocols into their blocks"   ON public.workout_time_protocols;
DROP POLICY IF EXISTS "Coaches can update time protocols in their blocks"     ON public.workout_time_protocols;
DROP POLICY IF EXISTS "Coaches can view time protocols in their blocks"       ON public.workout_time_protocols;

-- ── workout_rest_pause_sets policies (5) ────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view rest pause sets in assigned workouts"  ON public.workout_rest_pause_sets;
DROP POLICY IF EXISTS "Coaches can delete rest pause sets from their blocks"   ON public.workout_rest_pause_sets;
DROP POLICY IF EXISTS "Coaches can insert rest pause sets into their blocks"   ON public.workout_rest_pause_sets;
DROP POLICY IF EXISTS "Coaches can update rest pause sets in their blocks"     ON public.workout_rest_pause_sets;
DROP POLICY IF EXISTS "Coaches can view rest pause sets in their blocks"       ON public.workout_rest_pause_sets;

-- ── workout_hr_sets policies (2) ────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view HR sets for assigned workouts"    ON public.workout_hr_sets;
DROP POLICY IF EXISTS "Coaches can manage HR sets for their templates"    ON public.workout_hr_sets;

-- ── workout_ladder_sets policies (4) ────────────────────────────────────────
DROP POLICY IF EXISTS "Coaches can delete ladder sets from their blocks"  ON public.workout_ladder_sets;
DROP POLICY IF EXISTS "Coaches can insert ladder sets into their blocks"  ON public.workout_ladder_sets;
DROP POLICY IF EXISTS "Coaches can update ladder sets in their blocks"    ON public.workout_ladder_sets;
DROP POLICY IF EXISTS "Coaches can view ladder sets in their blocks"      ON public.workout_ladder_sets;

-- ── workout_drop_sets policies (5) ──────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can view drop sets in assigned workouts"  ON public.workout_drop_sets;
DROP POLICY IF EXISTS "Coaches can delete drop sets from their blocks"   ON public.workout_drop_sets;
DROP POLICY IF EXISTS "Coaches can insert drop sets into their blocks"   ON public.workout_drop_sets;
DROP POLICY IF EXISTS "Coaches can update drop sets in their blocks"     ON public.workout_drop_sets;
DROP POLICY IF EXISTS "Coaches can view drop sets in their blocks"       ON public.workout_drop_sets;

-- ── workout_pyramid_sets policies (4) ───────────────────────────────────────
DROP POLICY IF EXISTS "Coaches can delete pyramid sets from their blocks"  ON public.workout_pyramid_sets;
DROP POLICY IF EXISTS "Coaches can insert pyramid sets into their blocks"  ON public.workout_pyramid_sets;
DROP POLICY IF EXISTS "Coaches can update pyramid sets in their blocks"    ON public.workout_pyramid_sets;
DROP POLICY IF EXISTS "Coaches can view pyramid sets in their blocks"      ON public.workout_pyramid_sets;


-- ===========================================================================
-- PART 2: RENAME ENUM TYPE
-- ===========================================================================
ALTER TYPE public.workout_block_type RENAME TO workout_set_type;


-- ===========================================================================
-- PART 3: RENAME COLUMNS IN workout_blocks (before renaming the table)
-- ===========================================================================
ALTER TABLE public.workout_blocks RENAME COLUMN block_type  TO set_type;
ALTER TABLE public.workout_blocks RENAME COLUMN block_order TO set_order;
ALTER TABLE public.workout_blocks RENAME COLUMN block_name  TO set_name;
ALTER TABLE public.workout_blocks RENAME COLUMN block_notes TO set_notes;


-- ===========================================================================
-- PART 4: RENAME TABLE workout_blocks → workout_set_entries
-- (FK constraints in child tables remain valid; PostgreSQL tracks by OID)
-- ===========================================================================
ALTER TABLE public.workout_blocks RENAME TO workout_set_entries;


-- ===========================================================================
-- PART 5: RENAME workout_block_exercises
-- ===========================================================================
ALTER TABLE public.workout_block_exercises RENAME COLUMN block_id TO set_entry_id;
ALTER TABLE public.workout_block_exercises RENAME TO workout_set_entry_exercises;


-- ===========================================================================
-- PART 6: RENAME workout_block_completions (only if it exists)
-- ===========================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'workout_block_completions'
  ) THEN
    ALTER TABLE public.workout_block_completions RENAME COLUMN workout_block_id TO workout_set_entry_id;
    ALTER TABLE public.workout_block_completions RENAME TO workout_set_entry_completions;

    -- Rename the unique constraint name for clarity (optional but good hygiene)
    -- (constraint was UNIQUE(workout_log_id, workout_block_id))
    -- The constraint name "workout_block_completions_workout_log_id_workout_block_id_key" 
    -- can be renamed if desired, but PostgreSQL does not require it.
  END IF;
END $$;


-- ===========================================================================
-- PART 7: RENAME block_id → set_entry_id IN SPECIAL TABLES
-- ===========================================================================
ALTER TABLE public.workout_drop_sets        RENAME COLUMN block_id TO set_entry_id;
ALTER TABLE public.workout_cluster_sets     RENAME COLUMN block_id TO set_entry_id;
ALTER TABLE public.workout_rest_pause_sets  RENAME COLUMN block_id TO set_entry_id;
ALTER TABLE public.workout_pyramid_sets     RENAME COLUMN block_id TO set_entry_id;
ALTER TABLE public.workout_ladder_sets      RENAME COLUMN block_id TO set_entry_id;
ALTER TABLE public.workout_time_protocols   RENAME COLUMN block_id TO set_entry_id;
ALTER TABLE public.workout_hr_sets          RENAME COLUMN block_id TO set_entry_id;


-- ===========================================================================
-- PART 8: RENAME COLUMNS IN workout_set_logs
-- (block_id has no FK constraint to workout_blocks — just a UUID column)
-- ===========================================================================
ALTER TABLE public.workout_set_logs RENAME COLUMN block_id   TO set_entry_id;
ALTER TABLE public.workout_set_logs RENAME COLUMN block_type TO set_type;


-- ===========================================================================
-- PART 9: RENAME COLUMNS IN program_progression_rules
-- (block_id has no FK constraint — just a UUID column)
-- ===========================================================================
ALTER TABLE public.program_progression_rules RENAME COLUMN block_id    TO set_entry_id;
ALTER TABLE public.program_progression_rules RENAME COLUMN block_type  TO set_type;
ALTER TABLE public.program_progression_rules RENAME COLUMN block_order TO set_order;
ALTER TABLE public.program_progression_rules RENAME COLUMN block_name  TO set_name;


-- ===========================================================================
-- PART 10: RENAME INDEXES
-- (non-primary-key indexes; PK index auto-follows table rename in PG)
-- ===========================================================================
-- workout_set_entries (fka workout_blocks)
ALTER INDEX IF EXISTS idx_workout_blocks_template
  RENAME TO idx_workout_set_entries_template;
ALTER INDEX IF EXISTS idx_workout_blocks_template_id_id
  RENAME TO idx_workout_set_entries_template_id_id;

-- workout_set_entry_exercises (fka workout_block_exercises)
ALTER INDEX IF EXISTS idx_workout_block_exercises_block
  RENAME TO idx_workout_set_entry_exercises_set_entry;
ALTER INDEX IF EXISTS idx_workout_block_exercises_block_id
  RENAME TO idx_workout_set_entry_exercises_set_entry_id;
ALTER INDEX IF EXISTS idx_workout_block_exercises_exercise
  RENAME TO idx_workout_set_entry_exercises_exercise;
ALTER INDEX IF EXISTS idx_workout_block_exercises_exercise_id
  RENAME TO idx_workout_set_entry_exercises_exercise_id;

-- workout_set_entry_completions
ALTER INDEX IF EXISTS idx_workout_block_completions_workout_log_id
  RENAME TO idx_workout_set_entry_completions_workout_log_id;

-- Special tables
ALTER INDEX IF EXISTS idx_workout_drop_sets_block_id        RENAME TO idx_workout_drop_sets_set_entry_id;
ALTER INDEX IF EXISTS idx_workout_cluster_sets_block_id     RENAME TO idx_workout_cluster_sets_set_entry_id;
ALTER INDEX IF EXISTS idx_workout_rest_pause_sets_block_id  RENAME TO idx_workout_rest_pause_sets_set_entry_id;
ALTER INDEX IF EXISTS idx_workout_pyramid_sets_block_id     RENAME TO idx_workout_pyramid_sets_set_entry_id;
ALTER INDEX IF EXISTS idx_workout_ladder_sets_block_id      RENAME TO idx_workout_ladder_sets_set_entry_id;
ALTER INDEX IF EXISTS idx_workout_time_protocols_block_id   RENAME TO idx_workout_time_protocols_set_entry_id;
ALTER INDEX IF EXISTS idx_workout_hr_sets_block_id          RENAME TO idx_workout_hr_sets_set_entry_id;

-- summary_route_indexes name
ALTER INDEX IF EXISTS idx_workout_blocks_template_id
  RENAME TO idx_workout_set_entries_template_id;

-- special_set_indexes names
ALTER INDEX IF EXISTS idx_workout_block_exercises_block
  RENAME TO idx_workout_set_entry_exercises_set_entry;  -- safe duplicate guard via IF EXISTS


-- ===========================================================================
-- PART 11: RECREATE ALL DROPPED RLS POLICIES
-- (All references to workout_blocks/workout_block_exercises updated to
--  workout_set_entries/workout_set_entry_exercises; block_id → set_entry_id)
-- ===========================================================================

-- ── workout_set_entries (fka workout_blocks) ─────────────────────────────────

CREATE POLICY "Clients can read assigned workout set entries"
ON public.workout_set_entries FOR SELECT
TO authenticated
USING (
  template_id IN (
    SELECT workout_assignments.workout_template_id
    FROM workout_assignments
    WHERE workout_assignments.client_id = auth.uid()
  )
);

CREATE POLICY "Clients can view set entries in assigned workouts"
ON public.workout_set_entries FOR SELECT
TO public
USING (
  (EXISTS (
    SELECT 1
    FROM (workout_assignments wa
      JOIN workout_templates wt ON (wa.workout_template_id = wt.id))
    WHERE (wt.id = workout_set_entries.template_id AND wa.client_id = auth.uid())
  )) OR (EXISTS (
    SELECT 1
    FROM (program_assignments pa
      JOIN program_schedule ps ON (pa.program_id = ps.program_id))
    WHERE (ps.template_id = workout_set_entries.template_id
      AND pa.client_id = auth.uid()
      AND pa.status = 'active'::text)
  )) OR (EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE (wt.id = workout_set_entries.template_id AND wt.coach_id = auth.uid())
  )) OR is_admin(auth.uid())
);

CREATE POLICY "Coaches can delete set entries from their templates"
ON public.workout_set_entries FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM workout_templates wt
    WHERE wt.id = workout_set_entries.template_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert set entries into their templates"
ON public.workout_set_entries FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_templates wt
    WHERE wt.id = workout_set_entries.template_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can manage workout set entries"
ON public.workout_set_entries FOR ALL
TO public
USING (
  template_id IN (
    SELECT workout_templates.id
    FROM workout_templates
    WHERE workout_templates.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update set entries in their templates"
ON public.workout_set_entries FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM workout_templates wt
    WHERE wt.id = workout_set_entries.template_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_templates wt
    WHERE wt.id = workout_set_entries.template_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view set entries in their templates"
ON public.workout_set_entries FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM workout_templates wt
    WHERE wt.id = workout_set_entries.template_id
      AND wt.coach_id = auth.uid()
  )
);


-- ── workout_set_entry_exercises (fka workout_block_exercises) ────────────────

CREATE POLICY "Clients can read assigned workout set entry exercises"
ON public.workout_set_entry_exercises FOR SELECT
TO authenticated
USING (
  set_entry_id IN (
    SELECT workout_set_entries.id
    FROM workout_set_entries
    WHERE workout_set_entries.template_id IN (
      SELECT workout_assignments.workout_template_id
      FROM workout_assignments
      WHERE workout_assignments.client_id = auth.uid()
    )
  )
);

CREATE POLICY "Clients can view exercises in assigned workouts"
ON public.workout_set_entry_exercises FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM ((workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
      JOIN workout_assignments wa ON (wt.id = wa.workout_template_id))
    WHERE wb.id = workout_set_entry_exercises.set_entry_id
      AND wa.client_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete exercises from their set entries"
ON public.workout_set_entry_exercises FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_set_entry_exercises.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert exercises into their set entries"
ON public.workout_set_entry_exercises FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_set_entry_exercises.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update exercises in their set entries"
ON public.workout_set_entry_exercises FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_set_entry_exercises.set_entry_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_set_entry_exercises.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view exercises in their set entries"
ON public.workout_set_entry_exercises FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_set_entry_exercises.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);


-- ── workout_set_entry_completions (fka workout_block_completions) ────────────
-- Only created if the table exists (guarded by DO block below)

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'workout_set_entry_completions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Clients select own set entry completions"
      ON public.workout_set_entry_completions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.workout_logs wl
          WHERE wl.id = workout_set_entry_completions.workout_log_id
            AND wl.client_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Clients insert own set entry completions"
      ON public.workout_set_entry_completions FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workout_logs wl
          WHERE wl.id = workout_set_entry_completions.workout_log_id
            AND wl.client_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Clients update own set entry completions"
      ON public.workout_set_entry_completions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.workout_logs wl
          WHERE wl.id = workout_set_entry_completions.workout_log_id
            AND wl.client_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workout_logs wl
          WHERE wl.id = workout_set_entry_completions.workout_log_id
            AND wl.client_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Clients delete own set entry completions"
      ON public.workout_set_entry_completions FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.workout_logs wl
          WHERE wl.id = workout_set_entry_completions.workout_log_id
            AND wl.client_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END $$;


-- ── workout_cluster_sets ─────────────────────────────────────────────────────

CREATE POLICY "Clients can view cluster sets in assigned workouts"
ON public.workout_cluster_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM ((workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
      JOIN workout_assignments wa ON (wt.id = wa.workout_template_id))
    WHERE wb.id = workout_cluster_sets.set_entry_id
      AND wa.client_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete cluster sets from their set entries"
ON public.workout_cluster_sets FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_cluster_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert cluster sets into their set entries"
ON public.workout_cluster_sets FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_cluster_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update cluster sets in their set entries"
ON public.workout_cluster_sets FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_cluster_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_cluster_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view cluster sets in their set entries"
ON public.workout_cluster_sets FOR SELECT
TO public
USING (
  (EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_cluster_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )) OR is_admin(auth.uid())
);


-- ── workout_time_protocols ───────────────────────────────────────────────────

CREATE POLICY "Clients can view time protocols in assigned workouts"
ON public.workout_time_protocols FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM ((workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
      JOIN workout_assignments wa ON (wt.id = wa.workout_template_id))
    WHERE wb.id = workout_time_protocols.set_entry_id
      AND wa.client_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete time protocols from their set entries"
ON public.workout_time_protocols FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_time_protocols.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert time protocols into their set entries"
ON public.workout_time_protocols FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_time_protocols.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update time protocols in their set entries"
ON public.workout_time_protocols FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_time_protocols.set_entry_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_time_protocols.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view time protocols in their set entries"
ON public.workout_time_protocols FOR SELECT
TO public
USING (
  (EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_time_protocols.set_entry_id
      AND wt.coach_id = auth.uid()
  )) OR is_admin(auth.uid())
);


-- ── workout_rest_pause_sets ──────────────────────────────────────────────────

CREATE POLICY "Clients can view rest pause sets in assigned workouts"
ON public.workout_rest_pause_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM ((workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
      JOIN workout_assignments wa ON (wt.id = wa.workout_template_id))
    WHERE wb.id = workout_rest_pause_sets.set_entry_id
      AND wa.client_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete rest pause sets from their set entries"
ON public.workout_rest_pause_sets FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_rest_pause_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert rest pause sets into their set entries"
ON public.workout_rest_pause_sets FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_rest_pause_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update rest pause sets in their set entries"
ON public.workout_rest_pause_sets FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_rest_pause_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_rest_pause_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view rest pause sets in their set entries"
ON public.workout_rest_pause_sets FOR SELECT
TO public
USING (
  (EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_rest_pause_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )) OR is_admin(auth.uid())
);


-- ── workout_hr_sets ──────────────────────────────────────────────────────────

CREATE POLICY "Clients can view HR sets for assigned workouts"
ON public.workout_hr_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM ((workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
      JOIN workout_assignments wa ON (wt.id = wa.workout_template_id))
    WHERE wb.id = workout_hr_sets.set_entry_id
      AND wa.client_id = auth.uid()
  )
);

CREATE POLICY "Coaches can manage HR sets for their templates"
ON public.workout_hr_sets FOR ALL
TO public
USING (
  (EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_hr_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )) OR is_admin(auth.uid())
)
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_hr_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )) OR is_admin(auth.uid())
);


-- ── workout_ladder_sets ──────────────────────────────────────────────────────

CREATE POLICY "Coaches can delete ladder sets from their set entries"
ON public.workout_ladder_sets FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_ladder_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert ladder sets into their set entries"
ON public.workout_ladder_sets FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_ladder_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update ladder sets in their set entries"
ON public.workout_ladder_sets FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_ladder_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_ladder_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view ladder sets in their set entries"
ON public.workout_ladder_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_ladder_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);


-- ── workout_drop_sets ────────────────────────────────────────────────────────

CREATE POLICY "Clients can view drop sets in assigned workouts"
ON public.workout_drop_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM ((workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
      JOIN workout_assignments wa ON (wt.id = wa.workout_template_id))
    WHERE wb.id = workout_drop_sets.set_entry_id
      AND wa.client_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete drop sets from their set entries"
ON public.workout_drop_sets FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_drop_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert drop sets into their set entries"
ON public.workout_drop_sets FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_drop_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update drop sets in their set entries"
ON public.workout_drop_sets FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_drop_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_drop_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view drop sets in their set entries"
ON public.workout_drop_sets FOR SELECT
TO public
USING (
  (EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_drop_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )) OR is_admin(auth.uid())
);


-- ── workout_pyramid_sets ─────────────────────────────────────────────────────

CREATE POLICY "Coaches can delete pyramid sets from their set entries"
ON public.workout_pyramid_sets FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_pyramid_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert pyramid sets into their set entries"
ON public.workout_pyramid_sets FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_pyramid_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update pyramid sets in their set entries"
ON public.workout_pyramid_sets FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_pyramid_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_pyramid_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view pyramid sets in their set entries"
ON public.workout_pyramid_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM (workout_set_entries wb
      JOIN workout_templates wt ON (wb.template_id = wt.id))
    WHERE wb.id = workout_pyramid_sets.set_entry_id
      AND wt.coach_id = auth.uid()
  )
);


-- ===========================================================================
-- PART 12: VERIFICATION QUERIES (run these AFTER applying, to confirm)
-- ===========================================================================
-- Uncomment and run to verify:
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('workout_set_entries','workout_set_entry_exercises',
--                      'workout_set_entry_completions')
-- ORDER BY table_name;
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'workout_set_entries'
-- ORDER BY ordinal_position;
--
-- SELECT table_name, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('workout_set_entries','workout_set_entry_exercises')
-- ORDER BY tablename, policyname;
--
-- -- These should FAIL (tables no longer exist):
-- SELECT * FROM workout_blocks LIMIT 1;
-- SELECT * FROM workout_block_exercises LIMIT 1;

COMMIT;
