-- ============================================================================
-- Verification Queries
-- Purpose: Verify all migrations completed successfully
-- ============================================================================

-- Step 1: Verify JSON columns migrated
-- ============================================================================

-- Check exercises JSON columns
SELECT 
  'exercises.muscle_groups' as column_path,
  (SELECT COUNT(*) FROM exercises WHERE muscle_groups IS NOT NULL) as json_rows,
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_muscle_groups) as relational_rows,
  CASE 
    WHEN (SELECT COUNT(*) FROM exercises WHERE muscle_groups IS NOT NULL) = 0 
    THEN 'OK - No JSON data to migrate'
    WHEN (SELECT COUNT(DISTINCT exercise_id) FROM exercise_muscle_groups) >= 
         (SELECT COUNT(DISTINCT id) FROM exercises WHERE muscle_groups IS NOT NULL)
    THEN 'OK - All data migrated'
    ELSE 'WARNING - Some data may not be migrated'
  END as status
UNION ALL
SELECT 
  'exercises.equipment_types',
  (SELECT COUNT(*) FROM exercises WHERE equipment_types IS NOT NULL),
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_equipment),
  CASE 
    WHEN (SELECT COUNT(*) FROM exercises WHERE equipment_types IS NOT NULL) = 0 
    THEN 'OK - No JSON data to migrate'
    WHEN (SELECT COUNT(DISTINCT exercise_id) FROM exercise_equipment) >= 
         (SELECT COUNT(DISTINCT id) FROM exercises WHERE equipment_types IS NOT NULL)
    THEN 'OK - All data migrated'
    ELSE 'WARNING - Some data may not be migrated'
  END
UNION ALL
SELECT 
  'exercises.instructions',
  (SELECT COUNT(*) FROM exercises WHERE instructions IS NOT NULL),
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_instructions),
  CASE 
    WHEN (SELECT COUNT(*) FROM exercises WHERE instructions IS NOT NULL) = 0 
    THEN 'OK - No JSON data to migrate'
    WHEN (SELECT COUNT(DISTINCT exercise_id) FROM exercise_instructions) >= 
         (SELECT COUNT(DISTINCT id) FROM exercises WHERE instructions IS NOT NULL)
    THEN 'OK - All data migrated'
    ELSE 'WARNING - Some data may not be migrated'
  END
UNION ALL
SELECT 
  'exercises.tips',
  (SELECT COUNT(*) FROM exercises WHERE tips IS NOT NULL),
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_tips),
  CASE 
    WHEN (SELECT COUNT(*) FROM exercises WHERE tips IS NOT NULL) = 0 
    THEN 'OK - No JSON data to migrate'
    WHEN (SELECT COUNT(DISTINCT exercise_id) FROM exercise_tips) >= 
         (SELECT COUNT(DISTINCT id) FROM exercises WHERE tips IS NOT NULL)
    THEN 'OK - All data migrated'
    ELSE 'WARNING - Some data may not be migrated'
  END
UNION ALL
SELECT 
  'workout_exercise_logs.completed_sets',
  (SELECT COUNT(*) FROM workout_exercise_logs WHERE completed_sets IS NOT NULL),
  (SELECT COUNT(DISTINCT workout_exercise_log_id) FROM workout_set_details),
  CASE 
    WHEN (SELECT COUNT(*) FROM workout_exercise_logs WHERE completed_sets IS NOT NULL) = 0 
    THEN 'OK - No JSON data to migrate'
    WHEN (SELECT COUNT(DISTINCT workout_exercise_log_id) FROM workout_set_details) >= 
         (SELECT COUNT(DISTINCT id) FROM workout_exercise_logs WHERE completed_sets IS NOT NULL)
    THEN 'OK - All data migrated'
    ELSE 'WARNING - Some data may not be migrated'
  END
UNION ALL
SELECT 
  'workout_set_logs.giant_set_exercises',
  (SELECT COUNT(*) FROM workout_set_logs WHERE giant_set_exercises IS NOT NULL),
  (SELECT COUNT(DISTINCT workout_set_log_id) FROM workout_giant_set_exercise_logs),
  CASE 
    WHEN (SELECT COUNT(*) FROM workout_set_logs WHERE giant_set_exercises IS NOT NULL) = 0 
    THEN 'OK - No JSON data to migrate'
    WHEN (SELECT COUNT(DISTINCT workout_set_log_id) FROM workout_giant_set_exercise_logs) >= 
         (SELECT COUNT(DISTINCT id) FROM workout_set_logs WHERE giant_set_exercises IS NOT NULL)
    THEN 'OK - All data migrated'
    ELSE 'WARNING - Some data may not be migrated'
  END;

-- Step 2: Verify foreign key constraints
-- ============================================================================

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE 
    WHEN tc.constraint_name IS NOT NULL THEN 'OK'
    ELSE 'MISSING'
  END as constraint_status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'exercise_muscle_groups',
    'exercise_equipment',
    'exercise_instructions',
    'exercise_tips',
    'workout_set_details',
    'workout_giant_set_exercise_logs'
  )
ORDER BY tc.table_name, kcu.column_name;

-- Step 3: Verify indexes created
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'exercise_muscle_groups',
    'exercise_equipment',
    'exercise_instructions',
    'exercise_tips',
    'workout_set_details',
    'workout_giant_set_exercise_logs'
  )
ORDER BY tablename, indexname;

-- Step 4: Verify RLS policies
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'exercise_muscle_groups',
    'exercise_equipment',
    'exercise_instructions',
    'exercise_tips',
    'workout_set_details',
    'workout_giant_set_exercise_logs'
  )
ORDER BY tablename, policyname;

-- Step 5: Verify data integrity
-- ============================================================================

-- Check for orphaned records
SELECT 
  'exercise_muscle_groups' as table_name,
  COUNT(*) as orphaned_records
FROM exercise_muscle_groups emg
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.id = emg.exercise_id
)
UNION ALL
SELECT 
  'exercise_equipment',
  COUNT(*)
FROM exercise_equipment ee
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.id = ee.exercise_id
)
UNION ALL
SELECT 
  'exercise_instructions',
  COUNT(*)
FROM exercise_instructions ei
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.id = ei.exercise_id
)
UNION ALL
SELECT 
  'exercise_tips',
  COUNT(*)
FROM exercise_tips et
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.id = et.exercise_id
)
UNION ALL
SELECT 
  'workout_set_details',
  COUNT(*)
FROM workout_set_details wsd
WHERE NOT EXISTS (
  SELECT 1 FROM workout_exercise_logs wel WHERE wel.id = wsd.workout_exercise_log_id
)
UNION ALL
SELECT 
  'workout_giant_set_exercise_logs',
  COUNT(*)
FROM workout_giant_set_exercise_logs wgsel
WHERE NOT EXISTS (
  SELECT 1 FROM workout_set_logs wsl WHERE wsl.id = wgsel.workout_set_log_id
);

-- Step 6: Summary report
-- ============================================================================

SELECT 
  'Total new relational tables created' as metric,
  COUNT(*)::TEXT as value
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'exercise_muscle_groups',
    'exercise_equipment',
    'exercise_instructions',
    'exercise_tips',
    'workout_set_details',
    'workout_giant_set_exercise_logs'
  )
UNION ALL
SELECT 
  'Total rows migrated (exercise data)',
  (
    (SELECT COUNT(*) FROM exercise_muscle_groups) +
    (SELECT COUNT(*) FROM exercise_equipment) +
    (SELECT COUNT(*) FROM exercise_instructions) +
    (SELECT COUNT(*) FROM exercise_tips)
  )::TEXT
UNION ALL
SELECT 
  'Total rows migrated (workout logs)',
  (
    (SELECT COUNT(*) FROM workout_set_details) +
    (SELECT COUNT(*) FROM workout_giant_set_exercise_logs)
  )::TEXT
UNION ALL
SELECT 
  'Total indexes created',
  COUNT(*)::TEXT
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'exercise_muscle_groups',
    'exercise_equipment',
    'exercise_instructions',
    'exercise_tips',
    'workout_set_details',
    'workout_giant_set_exercise_logs'
  )
UNION ALL
SELECT 
  'Total RLS policies created',
  COUNT(*)::TEXT
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'exercise_muscle_groups',
    'exercise_equipment',
    'exercise_instructions',
    'exercise_tips',
    'workout_set_details',
    'workout_giant_set_exercise_logs'
  );

