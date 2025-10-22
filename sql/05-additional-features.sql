-- =====================================================
-- DailyFitness Additional Features
-- =====================================================
-- This file contains additional features like achievements, clip cards, and scheduling

-- 1. ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'milestone' CHECK (type IN ('milestone', 'goal', 'streak', 'personal_record')),
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CLIP CARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clip_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL,
    client_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    total_sessions INTEGER NOT NULL DEFAULT 10,
    used_sessions INTEGER DEFAULT 0,
    price DECIMAL(10,2),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PROGRESS TRACKING TABLES
-- =====================================================

-- Body measurements
CREATE TABLE IF NOT EXISTS public.body_measurements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    measurement_type TEXT NOT NULL CHECK (measurement_type IN ('weight', 'height', 'body_fat', 'muscle_mass', 'waist', 'chest', 'arms', 'thighs')),
    value DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    measured_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout logs
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    session_id UUID REFERENCES public.sessions(id),
    exercise_id UUID REFERENCES public.exercises(id),
    sets_completed INTEGER DEFAULT 0,
    reps_completed TEXT,
    weight_used DECIMAL(8,2),
    duration_minutes INTEGER,
    notes TEXT,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MESSAGING SYSTEM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
-- =====================================================

-- Achievements (clients can manage their own, coaches can read their clients')
DROP POLICY IF EXISTS "Clients can manage their achievements" ON public.achievements;
CREATE POLICY "Clients can manage their achievements" ON public.achievements
    FOR ALL USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can read their clients' achievements" ON public.achievements;
CREATE POLICY "Coaches can read their clients' achievements" ON public.achievements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.client_id = achievements.client_id 
            AND clients.coach_id = auth.uid()
        )
    );

-- Clip Cards (coaches can manage, clients can read their own)
DROP POLICY IF EXISTS "Coaches can manage clip cards" ON public.clip_cards;
CREATE POLICY "Coaches can manage clip cards" ON public.clip_cards
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients can read their clip cards" ON public.clip_cards;
CREATE POLICY "Clients can read their clip cards" ON public.clip_cards
    FOR SELECT USING (client_id = auth.uid());

-- Body Measurements (clients can manage their own, coaches can read their clients')
DROP POLICY IF EXISTS "Clients can manage their body measurements" ON public.body_measurements;
CREATE POLICY "Clients can manage their body measurements" ON public.body_measurements
    FOR ALL USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can read their clients' body measurements" ON public.body_measurements;
CREATE POLICY "Coaches can read their clients' body measurements" ON public.body_measurements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.client_id = body_measurements.client_id 
            AND clients.coach_id = auth.uid()
        )
    );

-- Workout Logs (clients can manage their own, coaches can read their clients')
DROP POLICY IF EXISTS "Clients can manage their workout logs" ON public.workout_logs;
CREATE POLICY "Clients can manage their workout logs" ON public.workout_logs
    FOR ALL USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can read their clients' workout logs" ON public.workout_logs;
CREATE POLICY "Coaches can read their clients' workout logs" ON public.workout_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.client_id = workout_logs.client_id 
            AND clients.coach_id = auth.uid()
        )
    );

-- Messages (users can manage their own messages)
DROP POLICY IF EXISTS "Users can manage their messages" ON public.messages;
CREATE POLICY "Users can manage their messages" ON public.messages
    FOR ALL USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- 7. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_achievements_client_id ON public.achievements(client_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON public.achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_achieved_at ON public.achievements(achieved_at);

CREATE INDEX IF NOT EXISTS idx_clip_cards_coach_id ON public.clip_cards(coach_id);
CREATE INDEX IF NOT EXISTS idx_clip_cards_client_id ON public.clip_cards(client_id);
CREATE INDEX IF NOT EXISTS idx_clip_cards_status ON public.clip_cards(status);

CREATE INDEX IF NOT EXISTS idx_body_measurements_client_id ON public.body_measurements(client_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_measurement_type ON public.body_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS idx_body_measurements_measured_date ON public.body_measurements(measured_date);

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_id ON public.workout_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_session_id ON public.workout_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_id ON public.workout_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_logged_date ON public.workout_logs(logged_date);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at);

-- 8. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.achievements TO authenticated;
GRANT ALL ON public.clip_cards TO authenticated;
GRANT ALL ON public.body_measurements TO authenticated;
GRANT ALL ON public.workout_logs TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- Success message
SELECT 'Additional features setup completed successfully! 🎯' as message;
