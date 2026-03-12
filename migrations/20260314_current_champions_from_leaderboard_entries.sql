-- Recreate current_champions to read from leaderboard_entries (rank = 1) instead of leaderboard_rankings.
-- Preserves security_invoker and exposes columns compatible with existing consumers.

DROP VIEW IF EXISTS public.current_champions CASCADE;

CREATE VIEW public.current_champions
WITH (security_invoker = on)
AS
SELECT
  le.leaderboard_type AS category,
  NULL::character varying AS sex_filter,
  le.client_id,
  COALESCE(le.display_name, (p.first_name || ' ' || COALESCE(p.last_name, ''))) AS name,
  p.sex,
  p.bodyweight,
  le.score,
  COALESCE(
    CASE
      WHEN le.exercise_id IS NOT NULL AND e.name IS NOT NULL THEN e.name || ' ' ||
        CASE le.leaderboard_type
          WHEN 'pr_1rm' THEN '1RM'
          WHEN 'pr_3rm' THEN '3RM'
          WHEN 'pr_5rm' THEN '5RM'
          WHEN 'bw_multiple' THEN 'BW'
          ELSE le.leaderboard_type
        END
      WHEN le.leaderboard_type = 'tonnage_week' THEN 'Weekly Tonnage'
      WHEN le.leaderboard_type = 'tonnage_month' THEN 'Monthly Tonnage'
      WHEN le.leaderboard_type = 'tonnage_all_time' THEN 'All-Time Tonnage'
      ELSE le.leaderboard_type
    END,
    le.leaderboard_type
  ) AS title,
  le.last_updated AS calculated_at,
  le.exercise_id,
  le.time_window
FROM public.leaderboard_entries le
JOIN public.profiles p ON p.id = le.client_id
LEFT JOIN public.exercises e ON e.id = le.exercise_id
WHERE le.rank = 1
ORDER BY le.leaderboard_type, le.time_window, le.exercise_id;
