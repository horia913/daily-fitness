-- Add RIR and Tempo columns to workout_template_exercises table
-- =====================================================

-- Add the new columns
ALTER TABLE public.workout_template_exercises 
ADD COLUMN IF NOT EXISTS sets INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS reps TEXT DEFAULT '8-10',
ADD COLUMN IF NOT EXISTS rest_seconds INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS rir INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS tempo TEXT DEFAULT '2-0-1-0';

-- Update existing records with default values
UPDATE public.workout_template_exercises 
SET 
    sets = COALESCE(sets, 3),
    reps = COALESCE(reps, '8-10'),
    rest_seconds = COALESCE(rest_seconds, 60),
    rir = COALESCE(rir, 2),
    tempo = COALESCE(tempo, '2-0-1-0')
WHERE sets IS NULL OR reps IS NULL OR rest_seconds IS NULL OR rir IS NULL OR tempo IS NULL;

-- Add constraints
ALTER TABLE public.workout_template_exercises 
ADD CONSTRAINT check_rir_range CHECK (rir >= 0 AND rir <= 5);

-- Add comments
COMMENT ON COLUMN public.workout_template_exercises.rir IS 'Reps in Reserve (0-5) - how many reps left in the tank';
COMMENT ON COLUMN public.workout_template_exercises.tempo IS 'Tempo format: eccentric-pause-concentric-pause (e.g., 2-0-1-0)';
COMMENT ON COLUMN public.workout_template_exercises.sets IS 'Number of sets for this exercise';
COMMENT ON COLUMN public.workout_template_exercises.reps IS 'Rep range or specific reps (e.g., 8-10 or 12)';
COMMENT ON COLUMN public.workout_template_exercises.rest_seconds IS 'Rest time between sets in seconds';
