-- Unique index for leaderboard_entries upsert: one row per (client, type, exercise, time_window).
-- NULLs in exercise_id/time_window are normalized to a sentinel for uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_entries_upsert
  ON public.leaderboard_entries (
    client_id,
    leaderboard_type,
    COALESCE(exercise_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(time_window, 'all_time')
  );
