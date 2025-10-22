-- Habit Tracker Module Database Schema
-- This script creates the tables needed for the habit tracking feature

-- Create habits table to store habit definitions
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily', 'weekly')),
    target_days INTEGER DEFAULT 1 CHECK (target_days >= 1 AND target_days <= 7), -- For weekly habits
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create habit_assignments table to assign habits to clients
CREATE TABLE IF NOT EXISTS habit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- Optional end date for the assignment
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, client_id, start_date)
);

-- Create habit_logs table to track habit completions
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES habit_assignments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- Optional notes about the completion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, log_date) -- Prevent duplicate logs for the same day
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_coach_id ON habits(coach_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(is_active);
CREATE INDEX IF NOT EXISTS idx_habit_assignments_habit_id ON habit_assignments(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_assignments_client_id ON habit_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_habit_assignments_active ON habit_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_habit_logs_assignment_id ON habit_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_client_id ON habit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(log_date);

-- Enable Row Level Security (RLS)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can manage their own habits" ON habits;
DROP POLICY IF EXISTS "Clients can view habits assigned to them" ON habits;
DROP POLICY IF EXISTS "Clients can view habits" ON habits;
DROP POLICY IF EXISTS "Coaches can manage assignments for their habits" ON habit_assignments;
DROP POLICY IF EXISTS "Clients can view their own assignments" ON habit_assignments;
DROP POLICY IF EXISTS "Clients can manage their own habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Coaches can view logs for their clients" ON habit_logs;
DROP POLICY IF EXISTS "Coaches can view habit logs" ON habit_logs;

-- RLS Policies for habits table
CREATE POLICY "Coaches can manage their own habits" ON habits
    FOR ALL USING (auth.uid() = coach_id);

-- Simplified policy for clients - allow read access to all habits
-- The application layer will filter which habits are shown to clients
CREATE POLICY "Clients can view habits" ON habits
    FOR SELECT USING (true);

-- RLS Policies for habit_assignments table
CREATE POLICY "Coaches can manage assignments for their habits" ON habit_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM habits 
            WHERE habits.id = habit_assignments.habit_id 
            AND habits.coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can view their own assignments" ON habit_assignments
    FOR SELECT USING (auth.uid() = client_id);

-- RLS Policies for habit_logs table
CREATE POLICY "Clients can manage their own habit logs" ON habit_logs
    FOR ALL USING (auth.uid() = client_id);

-- Simplified policy for coaches - allow read access to all habit logs
-- The application layer will filter which logs are shown to coaches
CREATE POLICY "Coaches can view habit logs" ON habit_logs
    FOR SELECT USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
DROP TRIGGER IF EXISTS update_habit_assignments_updated_at ON habit_assignments;

-- Create triggers for updated_at
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_assignments_updated_at BEFORE UPDATE ON habit_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (only if there's an authenticated user)
-- Note: This will only work when run by an authenticated user
-- For initial setup, you may need to manually create habits through the app interface
DO $$
BEGIN
    -- Only insert sample data if there's an authenticated user
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO habits (coach_id, name, description, frequency_type, target_days) VALUES
            (auth.uid(), 'Drink 3L of Water', 'Stay hydrated throughout the day', 'daily', 1),
            (auth.uid(), '10,000 Steps', 'Walk at least 10,000 steps daily', 'daily', 1),
            (auth.uid(), 'Read for 30 minutes', 'Read books or articles for personal development', 'daily', 1),
            (auth.uid(), 'Meditate', 'Practice mindfulness and meditation', 'daily', 1),
            (auth.uid(), 'Exercise 3x per week', 'Complete at least 3 workout sessions', 'weekly', 3)
        ON CONFLICT DO NOTHING; -- Prevent duplicate insertions
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON habits TO authenticated;
GRANT ALL ON habit_assignments TO authenticated;
GRANT ALL ON habit_logs TO authenticated;

-- Create view for easy habit tracking queries
CREATE OR REPLACE VIEW habit_tracking_summary AS
SELECT 
    ha.id as assignment_id,
    ha.client_id,
    h.name as habit_name,
    h.description as habit_description,
    h.frequency_type,
    h.target_days,
    ha.start_date,
    ha.end_date,
    ha.is_active as assignment_active,
    COUNT(hl.id) as total_completions,
    CASE 
        WHEN h.frequency_type = 'daily' THEN
            (CURRENT_DATE - ha.start_date) + 1
        WHEN h.frequency_type = 'weekly' THEN
            CEIL((CURRENT_DATE - ha.start_date) / 7.0)
    END as expected_completions,
    CASE 
        WHEN h.frequency_type = 'daily' THEN
            ROUND((COUNT(hl.id)::DECIMAL / ((CURRENT_DATE - ha.start_date) + 1)) * 100, 2)
        WHEN h.frequency_type = 'weekly' THEN
            ROUND((COUNT(hl.id)::DECIMAL / CEIL((CURRENT_DATE - ha.start_date) / 7.0)) * 100, 2)
    END as completion_percentage
FROM habit_assignments ha
JOIN habits h ON h.id = ha.habit_id
LEFT JOIN habit_logs hl ON hl.assignment_id = ha.id
WHERE ha.is_active = true AND h.is_active = true
GROUP BY ha.id, ha.client_id, h.name, h.description, h.frequency_type, h.target_days, ha.start_date, ha.end_date, ha.is_active;

-- Grant permissions on the view
GRANT SELECT ON habit_tracking_summary TO authenticated;
