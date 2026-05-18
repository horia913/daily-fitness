-- Manual recompute (ops): one client + exercise after rare admin deletes.
-- Replace the UUID literals below before running.

-- 1) Flip current flags off for this pair
UPDATE public.personal_records
SET is_current_record = false, updated_at = now()
WHERE client_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND exercise_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND is_current_record = true;

-- 2) Re-seed from workout_set_logs using the same logic as
--    migrations/20260516_pr_v2_strength_endurance_backfill.sql
--    plus a max_strength pass (MAX(weight)) — run in SQL editor or adapt per environment.
