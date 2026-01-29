-- Migration: Create coaches_public table for signup dropdown
-- Purpose: Expose ONLY minimal coach info (first_name, last_name) to anonymous users
-- This avoids exposing the full profiles table
--
-- Run this in PRODUCTION Supabase SQL Editor (the one used by Vercel)

-- ============================================
-- STEP 1: Create the table
-- ============================================
CREATE TABLE IF NOT EXISTS public.coaches_public (
  coach_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.coaches_public IS 'Public-safe coach list for signup dropdown. Only exposes names, no PII.';

-- ============================================
-- STEP 2: Enable Row Level Security
-- ============================================
ALTER TABLE public.coaches_public ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create RLS policies
-- ============================================

-- Allow anonymous users to SELECT active coaches
CREATE POLICY "anon_can_read_active_coaches"
ON public.coaches_public
FOR SELECT
TO anon
USING (is_active = true);

-- Allow authenticated users to SELECT active coaches (backup)
CREATE POLICY "authenticated_can_read_active_coaches"
ON public.coaches_public
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow admins to manage coaches_public (for sync operations)
CREATE POLICY "admins_can_manage_coaches_public"
ON public.coaches_public
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- STEP 4: Create index for sorting
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coaches_public_sort 
ON public.coaches_public (sort_order, last_name);

CREATE INDEX IF NOT EXISTS idx_coaches_public_active 
ON public.coaches_public (is_active) 
WHERE is_active = true;

-- ============================================
-- STEP 5: Verify table was created
-- ============================================
SELECT 
  'Table created' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'coaches_public') as table_exists;

-- ============================================
-- STEP 6: Verify RLS policies
-- ============================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as "USING clause"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'coaches_public'
ORDER BY policyname;

-- Expected: Should show 3 policies (anon, authenticated, admin)
