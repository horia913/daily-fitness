-- =====================================================
-- DailyFitness ClipCards Complete Setup
-- =====================================================
-- This file contains the complete setup for the ClipCards system

-- 1. CREATE CLIPCARD TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clipcard_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL,
    name TEXT NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 1 CHECK (sessions_count > 0),
    validity_days INTEGER NOT NULL DEFAULT 30 CHECK (validity_days > 0),
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE CLIPCARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clipcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL,
    client_id UUID NOT NULL,
    clipcard_type_id UUID NOT NULL,
    sessions_total INTEGER NOT NULL,
    sessions_used INTEGER DEFAULT 0 CHECK (sessions_used >= 0),
    sessions_remaining INTEGER GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_sessions CHECK (sessions_used <= sessions_total)
);

-- 3. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================
ALTER TABLE public.clipcard_types ADD CONSTRAINT clipcard_types_coach_id_fkey 
    FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.clipcards ADD CONSTRAINT clipcards_coach_id_fkey 
    FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.clipcards ADD CONSTRAINT clipcards_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.clipcards ADD CONSTRAINT clipcards_clipcard_type_id_fkey 
    FOREIGN KEY (clipcard_type_id) REFERENCES public.clipcard_types(id) ON DELETE CASCADE;

-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.clipcard_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipcards ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR CLIPCARD TYPES
-- =====================================================
-- Coaches can view their own clipcard types
CREATE POLICY "Coaches can view their own clipcard types" ON public.clipcard_types
    FOR SELECT USING (auth.uid() = coach_id);

-- Coaches can insert their own clipcard types
CREATE POLICY "Coaches can insert their own clipcard types" ON public.clipcard_types
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Coaches can update their own clipcard types
CREATE POLICY "Coaches can update their own clipcard types" ON public.clipcard_types
    FOR UPDATE USING (auth.uid() = coach_id);

-- Coaches can delete their own clipcard types
CREATE POLICY "Coaches can delete their own clipcard types" ON public.clipcard_types
    FOR DELETE USING (auth.uid() = coach_id);

-- 6. RLS POLICIES FOR CLIPCARDS
-- =====================================================
-- Coaches can view their clipcards
CREATE POLICY "Coaches can view their clipcards" ON public.clipcards
    FOR SELECT USING (auth.uid() = coach_id);

-- Coaches can insert their clipcards
CREATE POLICY "Coaches can insert their clipcards" ON public.clipcards
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Coaches can update their clipcards
CREATE POLICY "Coaches can update their clipcards" ON public.clipcards
    FOR UPDATE USING (auth.uid() = coach_id);

-- Coaches can delete their clipcards
CREATE POLICY "Coaches can delete their clipcards" ON public.clipcards
    FOR DELETE USING (auth.uid() = coach_id);

-- Clients can view their own clipcards
CREATE POLICY "Clients can view their own clipcards" ON public.clipcards
    FOR SELECT USING (auth.uid() = client_id);

-- 7. HELPER FUNCTIONS (OPTIONAL)
-- =====================================================
-- Function to create a new clipcard
CREATE OR REPLACE FUNCTION create_clipcard(
    p_coach_id UUID,
    p_client_id UUID,
    p_clipcard_type_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_sessions_count INTEGER;
    v_validity_days INTEGER;
    v_end_date DATE;
    v_clipcard_id UUID;
BEGIN
    -- Get clipcard type details
    SELECT sessions_count, validity_days
    INTO v_sessions_count, v_validity_days
    FROM public.clipcard_types
    WHERE id = p_clipcard_type_id AND coach_id = p_coach_id;

    IF v_sessions_count IS NULL THEN
        RAISE EXCEPTION 'Clipcard type not found or not owned by coach.';
    END IF;

    -- Calculate end date
    v_end_date := CURRENT_DATE + v_validity_days;

    -- Insert new clipcard
    INSERT INTO public.clipcards (coach_id, client_id, clipcard_type_id, sessions_total, sessions_used, start_date, end_date, is_active)
    VALUES (p_coach_id, p_client_id, p_clipcard_type_id, v_sessions_count, 0, CURRENT_DATE, v_end_date, TRUE)
    RETURNING id INTO v_clipcard_id;

    RETURN v_clipcard_id;
END;
$$;

-- Function to use a clipcard session
CREATE OR REPLACE FUNCTION use_clipcard_session(
    p_clipcard_id UUID,
    p_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_sessions_remaining INTEGER;
BEGIN
    SELECT sessions_remaining INTO v_sessions_remaining
    FROM public.clipcards
    WHERE id = p_clipcard_id AND client_id = p_client_id
    FOR UPDATE; -- Lock the row to prevent race conditions

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clipcard not found or not owned by client.';
    END IF;

    IF v_sessions_remaining <= 0 THEN
        RAISE EXCEPTION 'No sessions remaining on this clipcard.';
    END IF;

    UPDATE public.clipcards
    SET
        sessions_used = sessions_used + 1,
        updated_at = NOW()
    WHERE
        id = p_clipcard_id AND client_id = p_client_id;

    RETURN TRUE;
END;
$$;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- The ClipCards system is now ready to use!
-- 
-- Tables created:
-- - clipcard_types: Defines different session packages
-- - clipcards: Individual client ClipCards
--
-- Features:
-- - Row Level Security (RLS) enabled
-- - Foreign key constraints for data integrity
-- - Helper functions for common operations
-- - Automatic session remaining calculation
-- - Proper access control for coaches and clients
