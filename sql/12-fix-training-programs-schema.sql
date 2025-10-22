-- =====================================================
-- Training Programs Schema Fixes
-- =====================================================
-- This script fixes the training programs system by adding proper columns
-- for exercise types and complex data storage

-- 1. ADD EXERCISE TYPE AND DETAILS COLUMNS
-- =====================================================
-- Add exercise_type column to workout_template_exercises
ALTER TABLE public.workout_template_exercises 
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'straight_set';

-- Add details JSONB column for complex exercise data
ALTER TABLE public.workout_template_exercises 
ADD COLUMN IF NOT EXISTS details JSONB;

-- 2. MIGRATE EXISTING DATA FROM NOTES FIELD
-- =====================================================
-- Extract exercise_type from existing JSON in notes field
UPDATE public.workout_template_exercises 
SET exercise_type = CASE 
  WHEN notes LIKE '%"exercise_type":"tabata"%' THEN 'tabata'
  WHEN notes LIKE '%"exercise_type":"circuit"%' THEN 'circuit'
  WHEN notes LIKE '%"exercise_type":"superset"%' THEN 'superset'
  WHEN notes LIKE '%"exercise_type":"drop_set"%' THEN 'drop_set'
  WHEN notes LIKE '%"exercise_type":"giant_set"%' THEN 'giant_set'
  WHEN notes LIKE '%"exercise_type":"amrap"%' THEN 'amrap'
  WHEN notes LIKE '%"exercise_type":"emom"%' THEN 'emom'
  WHEN notes LIKE '%"exercise_type":"cluster_set"%' THEN 'cluster_set'
  WHEN notes LIKE '%"exercise_type":"rest_pause"%' THEN 'rest_pause'
  WHEN notes LIKE '%"exercise_type":"pre_exhaustion"%' THEN 'pre_exhaustion'
  WHEN notes LIKE '%"exercise_type":"for_time"%' THEN 'for_time'
  WHEN notes LIKE '%"exercise_type":"ladder"%' THEN 'ladder'
  WHEN notes LIKE '%"exercise_type":"pyramid_set"%' THEN 'pyramid_set'
  ELSE 'straight_set'
END
WHERE exercise_type IS NULL OR exercise_type = 'straight_set';

-- Extract complex data from JSON in notes field to details column
UPDATE public.workout_template_exercises 
SET details = CASE 
  WHEN notes LIKE '%{%' AND notes LIKE '%"exercise_type"%' THEN 
    notes::JSONB
  ELSE NULL
END
WHERE details IS NULL;

-- Clean up notes field - remove JSON data, keep only regular text notes
UPDATE public.workout_template_exercises 
SET notes = CASE 
  WHEN notes LIKE '%{%' AND notes LIKE '%"exercise_type"%' THEN 
    COALESCE((notes::JSONB->>'notes'), '')
  ELSE notes
END
WHERE notes LIKE '%{%' AND notes LIKE '%"exercise_type"%';

-- 3. ADD PROGRESS TRACKING TO PROGRAM ASSIGNMENTS
-- =====================================================
-- Add progress tracking columns to program_assignments
ALTER TABLE public.program_assignments 
ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1;

ALTER TABLE public.program_assignments 
ADD COLUMN IF NOT EXISTS current_day_of_week INTEGER DEFAULT 1;

-- 4. ADD INDEXES FOR PERFORMANCE
-- =====================================================
-- Index on exercise_type for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_exercise_type 
ON public.workout_template_exercises(exercise_type);

-- GIN index on details JSONB for complex queries
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_details 
ON public.workout_template_exercises USING GIN (details);

-- Index on program assignment progress tracking
CREATE INDEX IF NOT EXISTS idx_program_assignments_progress 
ON public.program_assignments(current_week, current_day_of_week);

-- 5. ADD CONSTRAINTS FOR DATA INTEGRITY
-- =====================================================
-- Add check constraint for valid exercise types
ALTER TABLE public.workout_template_exercises 
ADD CONSTRAINT check_exercise_type 
CHECK (exercise_type IN (
  'straight_set', 'superset', 'dropset', 'circuit', 'tabata', 
  'amrap', 'emom', 'giant_set', 'cluster_set', 'rest_pause', 
  'pre_exhaustion', 'for_time', 'ladder', 'pyramid_set'
));

-- Add check constraint for progress tracking
ALTER TABLE public.program_assignments 
ADD CONSTRAINT check_current_week 
CHECK (current_week >= 1);

ALTER TABLE public.program_assignments 
ADD CONSTRAINT check_current_day 
CHECK (current_day_of_week >= 1 AND current_day_of_week <= 7);

-- 6. UPDATE COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.workout_template_exercises.exercise_type IS 'Type of exercise: straight_set, superset, circuit, tabata, etc.';
COMMENT ON COLUMN public.workout_template_exercises.details IS 'JSONB column storing complex exercise data specific to exercise_type';
COMMENT ON COLUMN public.program_assignments.current_week IS 'Current week the client is on in the program';
COMMENT ON COLUMN public.program_assignments.current_day_of_week IS 'Current day (1-7) the client is on in the current week';

-- 7. VERIFICATION QUERIES
-- =====================================================
-- Check migration results
SELECT 
  'Migration Summary' as status,
  COUNT(*) as total_exercises,
  COUNT(CASE WHEN exercise_type != 'straight_set' THEN 1 END) as complex_exercises,
  COUNT(CASE WHEN details IS NOT NULL THEN 1 END) as exercises_with_details
FROM public.workout_template_exercises;

-- Check exercise type distribution
SELECT 
  exercise_type,
  COUNT(*) as count
FROM public.workout_template_exercises 
GROUP BY exercise_type 
ORDER BY count DESC;

-- Success message
SELECT 'Training programs schema fixes completed successfully! 🏋️‍♂️' as message;
