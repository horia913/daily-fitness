-- Program edit / coach UI: ensure indexes for template-scoped set entry + exercise lookups.
-- Idempotent; safe if 20260315_phase1_query_perf_indexes.sql or 20260303 already created equivalents.

CREATE INDEX IF NOT EXISTS idx_wse_exercises_set_entry
  ON public.workout_set_entry_exercises (set_entry_id);

CREATE INDEX IF NOT EXISTS idx_set_entries_template
  ON public.workout_set_entries (template_id);
