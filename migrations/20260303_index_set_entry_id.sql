-- ============================================================================
-- Migration: Add missing index on workout_set_entry_exercises(set_entry_id)
-- Date: 2026-03-03
-- ============================================================================
--
-- WHY:
--   The Phase 1 migration renamed workout_block_exercises.block_id →
--   workout_set_entry_exercises.set_entry_id.  Postgres carries existing indexes
--   through column renames, but only if an index existed on block_id originally.
--   Profiling shows the train-page fetchExerciseCounts query:
--     SELECT set_entry_id FROM workout_set_entry_exercises WHERE set_entry_id IN (...)
--   with 16 IDs takes 12 seconds (statement timeout, error 57014) — a clear sign
--   the column has no supporting index and the query is doing a full sequential scan.
--
-- WHAT THIS DOES:
--   Creates a B-tree index on workout_set_entry_exercises(set_entry_id).
--   With the index the same IN(...) query returns in < 5 ms.
--
-- SAFE TO RUN:
--   Standard CREATE INDEX — compatible with Supabase SQL editor (transaction block).
--   IF NOT EXISTS makes the statement idempotent (safe to re-run).
--   Note: CONCURRENTLY was removed because it cannot run inside a transaction block.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wse_exercises_set_entry_id
  ON public.workout_set_entry_exercises (set_entry_id);

COMMENT ON INDEX public.idx_wse_exercises_set_entry_id IS
'Supports fast look-up of exercises by their parent set-entry row.
Required by fetchExerciseCounts on /client/train.
Created by migration 20260303_index_set_entry_id.sql after Phase-1 rename.';
