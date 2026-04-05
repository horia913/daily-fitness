-- Include speed_work / endurance in WSEE-based counts; legacy rows when no WSEE yet.
CREATE OR REPLACE FUNCTION public.count_exercises_by_template_ids(p_template_ids uuid[])
RETURNS TABLE(template_id uuid, exercise_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT wt.id
    FROM workout_templates wt
    WHERE wt.id = ANY(p_template_ids)
      AND wt.coach_id = auth.uid()
  ),
  blocks AS (
    SELECT wse.id AS block_id, wse.template_id, wse.set_type
    FROM workout_set_entries wse
    INNER JOIN allowed a ON a.id = wse.template_id
  ),
  straight AS (
    SELECT b.template_id, COUNT(*)::bigint AS n
    FROM workout_set_entry_exercises wsee
    INNER JOIN blocks b ON b.block_id = wsee.set_entry_id
      AND b.set_type = ANY (
        ARRAY[
          'straight_set',
          'superset',
          'giant_set',
          'pre_exhaustion',
          'speed_work',
          'endurance'
        ]::workout_set_type[]
      )
    GROUP BY b.template_id
  ),
  speed_legacy AS (
    SELECT b.template_id, COUNT(*)::bigint AS n
    FROM workout_speed_sets s
    INNER JOIN blocks b ON b.block_id = s.set_entry_id AND b.set_type = 'speed_work'
    WHERE NOT EXISTS (
      SELECT 1
      FROM workout_set_entry_exercises w
      WHERE w.set_entry_id = b.block_id
    )
    GROUP BY b.template_id
  ),
  endurance_legacy AS (
    SELECT b.template_id, COUNT(*)::bigint AS n
    FROM workout_endurance_sets e
    INNER JOIN blocks b ON b.block_id = e.set_entry_id AND b.set_type = 'endurance'
    WHERE NOT EXISTS (
      SELECT 1
      FROM workout_set_entry_exercises w
      WHERE w.set_entry_id = b.block_id
    )
    GROUP BY b.template_id
  ),
  drops AS (
    SELECT b.template_id, COUNT(DISTINCT (d.exercise_id, d.exercise_order))::bigint AS n
    FROM workout_drop_sets d
    INNER JOIN blocks b ON b.block_id = d.set_entry_id AND b.set_type = 'drop_set'
    GROUP BY b.template_id
  ),
  clusters AS (
    SELECT b.template_id, COUNT(DISTINCT (c.exercise_id, c.exercise_order))::bigint AS n
    FROM workout_cluster_sets c
    INNER JOIN blocks b ON b.block_id = c.set_entry_id AND b.set_type = 'cluster_set'
    GROUP BY b.template_id
  ),
  rpause AS (
    SELECT b.template_id, COUNT(DISTINCT (r.exercise_id, r.exercise_order))::bigint AS n
    FROM workout_rest_pause_sets r
    INNER JOIN blocks b ON b.block_id = r.set_entry_id AND b.set_type = 'rest_pause'
    GROUP BY b.template_id
  ),
  tproto AS (
    SELECT b.template_id, COUNT(DISTINCT (t.exercise_id, t.exercise_order))::bigint AS n
    FROM workout_time_protocols t
    INNER JOIN blocks b ON b.block_id = t.set_entry_id
      AND b.set_type = ANY (ARRAY['amrap', 'emom', 'for_time', 'tabata']::workout_set_type[])
    GROUP BY b.template_id
  ),
  combined AS (
    SELECT template_id, n FROM straight
    UNION ALL
    SELECT template_id, n FROM speed_legacy
    UNION ALL
    SELECT template_id, n FROM endurance_legacy
    UNION ALL
    SELECT template_id, n FROM drops
    UNION ALL
    SELECT template_id, n FROM clusters
    UNION ALL
    SELECT template_id, n FROM rpause
    UNION ALL
    SELECT template_id, n FROM tproto
  ),
  per_template AS (
    SELECT c.template_id, SUM(c.n)::bigint AS total
    FROM combined c
    GROUP BY c.template_id
  )
  SELECT a.id AS template_id, COALESCE(p.total, 0)::bigint AS exercise_count
  FROM allowed a
  LEFT JOIN per_template p ON p.template_id = a.id;
$$;

COMMENT ON FUNCTION public.count_exercises_by_template_ids(uuid[]) IS
  'Returns exercise_count per template; includes WSEE for speed_work/endurance; legacy speed/endurance rows when block has no WSEE.';
