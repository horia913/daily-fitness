-- =====================================================
-- FIX EXERCISE CATEGORIES RLS POLICIES
-- =====================================================
-- This script sets up proper Row Level Security policies
-- for the exercise_categories table so coaches can
-- create, read, update, and delete categories
-- =====================================================

-- First, create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.exercise_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icon TEXT NOT NULL DEFAULT 'Dumbbell',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read exercise categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Coaches can insert exercise categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Coaches can update exercise categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Coaches can delete exercise categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Coaches can manage exercise categories" ON public.exercise_categories;

-- Create comprehensive policies for coaches

-- 1. Everyone can read categories (for dropdown in exercise form)
CREATE POLICY "Anyone can read exercise categories"
ON public.exercise_categories
FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. Coaches can insert categories
CREATE POLICY "Coaches can insert exercise categories"
ON public.exercise_categories
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'coach'
    )
);

-- 3. Coaches can update categories
CREATE POLICY "Coaches can update exercise categories"
ON public.exercise_categories
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'coach'
    )
);

-- 4. Coaches can delete categories
CREATE POLICY "Coaches can delete exercise categories"
ON public.exercise_categories
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'coach'
    )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_exercise_categories_name ON public.exercise_categories(name);

-- Insert default categories if table is empty
INSERT INTO public.exercise_categories (name, description, color, icon)
VALUES
    ('Strength', 'Resistance and weight training exercises', '#EF4444', 'Dumbbell'),
    ('Cardio', 'Cardiovascular and endurance exercises', '#F59E0B', 'Heart'),
    ('Flexibility', 'Stretching and mobility exercises', '#10B981', 'Zap'),
    ('Balance', 'Stability and balance training', '#3B82F6', 'Target'),
    ('Rehabilitation', 'Recovery and rehabilitation exercises', '#8B5CF6', 'Activity')
ON CONFLICT (name) DO NOTHING;

-- Verification
DO $$
DECLARE
  v_count INTEGER;
  v_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.exercise_categories;
  SELECT COUNT(*) INTO v_policies FROM pg_policies WHERE tablename = 'exercise_categories';
  
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'EXERCISE CATEGORIES RLS POLICIES FIXED';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Table: exercise_categories';
  RAISE NOTICE 'Current categories: %', v_count;
  RAISE NOTICE 'RLS Policies: % (SELECT, INSERT, UPDATE, DELETE)', v_policies;
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Coaches can now create/edit/delete categories!';
  RAISE NOTICE 'Refresh your browser to test!';
  RAISE NOTICE '=============================================';
END $$;

