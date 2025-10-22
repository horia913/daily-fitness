-- Simple fixes for 400 errors - assumes tables exist but have issues

-- 1. Fix RLS policies for workout_assignments (most common cause of 400 errors)
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own workout assignments" ON workout_assignments;
DROP POLICY IF EXISTS "Coaches can view their clients workout assignments" ON workout_assignments;

-- Create proper RLS policies
CREATE POLICY "Users can view their own workout assignments" ON workout_assignments
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Coaches can view their clients workout assignments" ON workout_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'coach'
    )
  );

-- 2. Fix RLS policies for workout_templates
DROP POLICY IF EXISTS "Everyone can view workout templates" ON workout_templates;
CREATE POLICY "Everyone can view workout templates" ON workout_templates
  FOR SELECT USING (true);

-- 3. Fix RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- 4. Check if clients table has proper RLS policies
-- Enable RLS on clients table if not already enabled
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients table
DROP POLICY IF EXISTS "Users can view their client relationships" ON clients;
CREATE POLICY "Users can view their client relationships" ON clients
  FOR SELECT USING (auth.uid() = coach_id OR auth.uid() = client_id);

-- 5. Grant necessary permissions
GRANT SELECT ON workout_assignments TO authenticated;
GRANT SELECT ON workout_templates TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON clients TO authenticated;

-- 6. Update workout_assignments status values if needed
-- Check what status values actually exist and update them to be consistent
UPDATE workout_assignments SET status = 'assigned' WHERE status IS NULL;
UPDATE workout_assignments SET status = 'assigned' WHERE status NOT IN ('assigned', 'active', 'completed', 'cancelled');

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_id ON workout_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_status ON workout_assignments(status);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_template_id ON workout_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
