-- Fix for Console Errors - Database Schema Issues
-- This script addresses the 400 errors in the console

-- 1. Fix workout_assignments table queries
-- The issue is that queries are using 'status=active' but the table might not have this column
-- or the column might have different values

-- First, let's check if workout_assignments table exists and has the right structure
-- If not, create it properly

CREATE TABLE IF NOT EXISTS workout_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  workout_template_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for workout_assignments
ALTER TABLE workout_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for clients to see their own assignments
CREATE POLICY IF NOT EXISTS "Clients can view their own workout assignments" ON workout_assignments
  FOR SELECT USING (auth.uid() = client_id);

-- Policy for coaches to see their clients' assignments
CREATE POLICY IF NOT EXISTS "Coaches can view their clients' workout assignments" ON workout_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_relationships cr 
      WHERE cr.coach_id = auth.uid() 
      AND cr.client_id = workout_assignments.client_id
    )
  );

-- 2. Fix profiles table - ensure it has all necessary columns
-- The error shows "column profiles.coach_id does not exist"
-- This suggests the code is trying to query a coach_id column that doesn't exist

-- Add coach_id column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'coach_id') THEN
    ALTER TABLE profiles ADD COLUMN coach_id UUID;
  END IF;
END $$;

-- Add index for coach_id
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON profiles(coach_id);

-- 3. Fix client_relationships table if it doesn't exist
CREATE TABLE IF NOT EXISTS client_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  client_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, client_id)
);

-- Add RLS policies for client_relationships
ALTER TABLE client_relationships ENABLE ROW LEVEL SECURITY;

-- Policy for coaches to see their relationships
CREATE POLICY IF NOT EXISTS "Coaches can view their client relationships" ON client_relationships
  FOR SELECT USING (auth.uid() = coach_id);

-- Policy for clients to see their coach relationships
CREATE POLICY IF NOT EXISTS "Clients can view their coach relationships" ON client_relationships
  FOR SELECT USING (auth.uid() = client_id);

-- 4. Fix workout_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB,
  estimated_duration INTEGER DEFAULT 45,
  difficulty_level TEXT DEFAULT 'beginner',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for workout_templates
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

-- Policy for everyone to view active workout templates
CREATE POLICY IF NOT EXISTS "Everyone can view active workout templates" ON workout_templates
  FOR SELECT USING (is_active = true);

-- 5. Fix program_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS program_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  program_id UUID NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for program_assignments
ALTER TABLE program_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for clients to see their own program assignments
CREATE POLICY IF NOT EXISTS "Clients can view their own program assignments" ON program_assignments
  FOR SELECT USING (auth.uid() = client_id);

-- 6. Fix workout_programs table if it doesn't exist
CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for workout_programs
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;

-- Policy for everyone to view workout programs
CREATE POLICY IF NOT EXISTS "Everyone can view workout programs" ON workout_programs
  FOR SELECT USING (true);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_id ON workout_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_scheduled_date ON workout_assignments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_status ON workout_assignments(status);
CREATE INDEX IF NOT EXISTS idx_client_relationships_coach_id ON client_relationships(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_client_id ON client_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_client_id ON program_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_status ON program_assignments(status);

-- 8. Create a function to get user's coach (if they have one)
CREATE OR REPLACE FUNCTION get_user_coach(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT cr.coach_id 
    FROM client_relationships cr 
    WHERE cr.client_id = user_id 
    AND cr.status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create a function to get user's clients (if they are a coach)
CREATE OR REPLACE FUNCTION get_coach_clients(coach_id UUID)
RETURNS TABLE(client_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT cr.client_id 
  FROM client_relationships cr 
  WHERE cr.coach_id = coach_id 
  AND cr.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_coach(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_clients(UUID) TO authenticated;

-- 11. Update existing data to have proper status values
UPDATE workout_assignments SET status = 'assigned' WHERE status IS NULL;
UPDATE program_assignments SET status = 'active' WHERE status IS NULL;
UPDATE client_relationships SET status = 'active' WHERE status IS NULL;

COMMENT ON TABLE workout_assignments IS 'Stores workout assignments for clients';
COMMENT ON TABLE client_relationships IS 'Stores coach-client relationships';
COMMENT ON TABLE workout_templates IS 'Stores workout templates that can be assigned';
COMMENT ON TABLE program_assignments IS 'Stores program assignments for clients';
COMMENT ON TABLE workout_programs IS 'Stores workout programs that can be assigned';
