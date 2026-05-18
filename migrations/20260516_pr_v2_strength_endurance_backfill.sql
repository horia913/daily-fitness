-- PR v2: seed strength_endurance current rows from historical workout_set_logs.
-- Run AFTER 20260516_pr_v2_record_types.sql.

WITH agg AS (
  SELECT
    wsl.client_id,
    wsl.exercise_id,
    MAX(wsl.weight * wsl.reps) AS max_volume
  FROM public.workout_set_logs wsl
  WHERE wsl.weight IS NOT NULL
    AND wsl.weight > 0
    AND wsl.reps IS NOT NULL
    AND wsl.reps > 0
    AND wsl.exercise_id IS NOT NULL
    AND wsl.client_id IS NOT NULL
  GROUP BY wsl.client_id, wsl.exercise_id
),
best_rows AS (
  SELECT DISTINCT ON (wsl.client_id, wsl.exercise_id)
    wsl.client_id,
    wsl.exercise_id,
    (wsl.weight * wsl.reps) AS max_volume,
    wsl.weight AS source_weight,
    wsl.reps AS source_reps,
    wsl.completed_at AS source_completed_at,
    wsl.workout_log_id
  FROM public.workout_set_logs wsl
  INNER JOIN agg a
    ON a.client_id = wsl.client_id
   AND a.exercise_id = wsl.exercise_id
   AND (wsl.weight * wsl.reps) = a.max_volume
  WHERE wsl.weight IS NOT NULL
    AND wsl.weight > 0
    AND wsl.reps IS NOT NULL
    AND wsl.reps > 0
    AND wsl.exercise_id IS NOT NULL
    AND wsl.client_id IS NOT NULL
  ORDER BY wsl.client_id, wsl.exercise_id, wsl.completed_at DESC NULLS LAST, wsl.id DESC
)
INSERT INTO public.personal_records (
  client_id,
  exercise_id,
  record_type,
  record_value,
  record_unit,
  reps_at_record,
  weight_at_record,
  is_current_record,
  achieved_date,
  workout_assignment_id,
  previous_record_value,
  improvement_percentage,
  created_at,
  updated_at
)
SELECT
  br.client_id,
  br.exercise_id,
  'strength_endurance',
  br.max_volume,
  'kg·reps',
  br.source_reps::integer,
  br.source_weight,
  true,
  (br.source_completed_at AT TIME ZONE 'UTC')::date,
  wl.workout_assignment_id,
  NULL,
  NULL,
  now(),
  now()
FROM best_rows br
LEFT JOIN public.workout_logs wl ON wl.id = br.workout_log_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personal_records pr
  WHERE pr.client_id = br.client_id
    AND pr.exercise_id = br.exercise_id
    AND pr.record_type = 'strength_endurance'
);
