-- =====================================================
-- Workout Logs Table Setup
-- =====================================================
-- This file creates the workout_logs table for tracking
-- client workout performance history

-- Drop existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS public.workout_logs CASCADE;

-- Create workout_logs table
CREATE TABLE public.workout_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    template_exercise_id UUID REFERENCES public.workout_template_exercises(id) ON DELETE SET NULL,
    sets_completed INTEGER DEFAULT 0,
    reps_completed TEXT,
    weight_used DECIMAL(10,2),
    duration_minutes INTEGER,
    notes TEXT,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can manage their workout logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Coaches can read their clients workout logs" ON public.workout_logs;

-- RLS Policies
-- Clients can insert, update, delete, and select their own workout logs
CREATE POLICY "Clients can manage their workout logs" 
ON public.workout_logs
FOR ALL 
USING (client_id = auth.uid());

-- Coaches can read their clients' workout logs
CREATE POLICY "Coaches can read their clients workout logs" 
ON public.workout_logs
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.clients 
        WHERE clients.client_id = workout_logs.client_id 
        AND clients.coach_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_logs_client_id ON public.workout_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_id ON public.workout_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_session_id ON public.workout_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_logged_date ON public.workout_logs(logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_weight_used ON public.workout_logs(weight_used DESC) WHERE weight_used IS NOT NULL;

-- Grant permissions
GRANT ALL ON public.workout_logs TO authenticated;

-- Success message
SELECT 'Workout logs table setup completed successfully! 📊' as message;

