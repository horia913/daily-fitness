-- =====================================================
-- EXERCISE ALTERNATIVES TABLE
-- =====================================================
-- This script creates the exercise_alternatives table if it doesn't exist
-- or recreates it with the correct schema
-- =====================================================

-- Drop the table if it exists with wrong schema and recreate
DROP TABLE IF EXISTS public.exercise_alternatives CASCADE;

-- Create the exercise_alternatives table
CREATE TABLE public.exercise_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    alternative_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('equipment', 'difficulty', 'injury', 'preference')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(primary_exercise_id, alternative_exercise_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_primary ON public.exercise_alternatives(primary_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_alternative ON public.exercise_alternatives(alternative_exercise_id);

-- Enable Row Level Security
ALTER TABLE public.exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read exercise alternatives" ON public.exercise_alternatives;
DROP POLICY IF EXISTS "Coaches can manage exercise alternatives" ON public.exercise_alternatives;
DROP POLICY IF EXISTS "Coaches can update exercise alternatives" ON public.exercise_alternatives;
DROP POLICY IF EXISTS "Coaches can delete exercise alternatives" ON public.exercise_alternatives;

-- Create RLS Policies
CREATE POLICY "Anyone can read exercise alternatives" 
ON public.exercise_alternatives
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches can insert exercise alternatives" 
ON public.exercise_alternatives
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'coach'
    )
);

CREATE POLICY "Coaches can update exercise alternatives" 
ON public.exercise_alternatives
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'coach'
    )
);

CREATE POLICY "Coaches can delete exercise alternatives" 
ON public.exercise_alternatives
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'coach'
    )
);

-- Verification
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.exercise_alternatives;
  
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'EXERCISE ALTERNATIVES TABLE CREATED';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Table: exercise_alternatives';
  RAISE NOTICE 'Columns: id, primary_exercise_id, alternative_exercise_id, reason, notes, created_at';
  RAISE NOTICE 'Current rows: %', v_count;
  RAISE NOTICE 'Indexes: 2 (primary_exercise_id, alternative_exercise_id)';
  RAISE NOTICE 'RLS Policies: 4 (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Refresh your browser to clear cache!';
  RAISE NOTICE '=============================================';
END $$;

